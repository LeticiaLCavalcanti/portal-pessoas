/**
 * ============================================================================
 *  BFF do Portal Pessoas
 * ============================================================================
 *
 * Por que existe um BFF (e não chamadas diretas as APIs de domínio):
 *  1. AGREGAÇÃO: a home precisa de 5 sistemas legados. Fazer isso no browser
 *     custa 5 round-trips no 4G do colaborador em campo.
 *  2. CONTRATO ESTÁVEL: o legado muda de forma e ritmo próprios. O BFF absorve
 *     essa instabilidade para que a jornada não precise ser reescrita junto.
 *  3. SEGREDO E TOKEN: troca de token, escopos e credenciais de sistema ficam
 *     no servidor.
 *  4. REGISTRO DE JORNADAS: é o que permite publicar jornada sem tocar no shell.
 *
 * Risco assumido: o BFF pode virar um novo monolito compartilhado por 10 squads.
 * Mitigação (ver docs/01-proposta-tecnica.md): um módulo por domínio, com
 * CODEOWNERS por pasta, e evolução para GraphQL Federation quando o custo de
 * coordenação superar o custo operacional de N subgraphs.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as db from './data.js';
import { match } from './search.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });
await app.register(cors, { origin: true, exposedHeaders: ['x-correlation-id'] });

/** Propaga o correlation-id vindo do shell. Um id por sessão, ponta a ponta. */
app.addHook('onRequest', async (req, reply) => {
  const cid = req.headers['x-correlation-id'] ?? `bff-${Date.now().toString(36)}`;
  req.cid = cid;
  reply.header('x-correlation-id', cid);
});

const loadRegistry = () =>
  JSON.parse(readFileSync(join(here, 'registry.json'), 'utf8')).journeys;

app.get('/v1/me', async () => db.user);
app.get('/v1/flags', async () => db.flags);

/**
 * Catálogo de jornadas visíveis para ESTE colaborador.
 * O BFF já poda por papel; o rollout percentual é resolvido no cliente para
 * servir também de kill-switch local quando o remote falha.
 */
/**
 * Uma única definição de "o que este colaborador enxerga".
 *
 * Existe como função, e não repetida em cada rota, porque a busca precisa da
 * MESMA poda: um resultado de busca que leva a uma jornada fora do catálogo do
 * colaborador é um beco sem saída -- o shell não acha a rota e desenha erro.
 * Enquanto isso era um filtro copiado, o catálogo podava por papel e a busca
 * não.
 */
const journeysVisibleTo = (roles) =>
  loadRegistry().filter(
    (j) => j.requiredRoles.length === 0 || j.requiredRoles.some((r) => roles.has(r))
  );

app.get('/v1/journeys', async () => journeysVisibleTo(new Set(db.user.roles)));

app.get('/v1/home', async () => ({
  greeting: `Bom te ver, ${db.user.firstName}`,
  cards: db.homeCards
}));

/**
 * Busca global: fan-out por domínio com timeout curto e degradação parcial.
 *
 * A PARTICIPAÇÃO NA BUSCA É DECLARADA NO MANIFESTO, não no código do BFF.
 * `capabilities: ['search']` é o que coloca uma jornada no resultado -- e uma
 * jornada que não declara simplesmente não aparece, sem que ninguém edite este
 * arquivo. É o mecanismo que a ADR 0009 descreve; até esta função existir, a
 * ADR estava certa no papel e o índice era consultado inteiro, incluindo
 * jornada que não havia pedido para participar.
 *
 * A poda por papel vem junto de graça, porque a fonte é o catálogo visível e
 * não o registro cru.
 */
app.get('/v1/search', async (req) => {
  const query = String(req.query.q ?? '').trim();

  const participants = new Set(
    journeysVisibleTo(new Set(db.user.roles))
      .filter((j) => j.capabilities.includes('search'))
      .map((j) => j.id)
  );

  // O casamento ignora acento -- ver search.js. Num portal em português, quem
  // digita rápido escreve "ferias", e a comparação literal devolvia zero.
  return { query, hits: match(db.searchIndex, query, participants) };
});

app.get('/v1/notifications', async () => db.notifications);

/**
 * Marcar como lida.
 *
 * Existe porque o contador de avisos precisa reagir ao clique. Um badge que
 * nunca zera treina o colaborador a ignorar a notificação -- e a partir daí
 * nenhum aviso do portal funciona, inclusive os que importam.
 */
app.post('/v1/notifications/:id/read', async (req, reply) => {
  const n = db.notifications.find((x) => x.id === req.params.id);
  if (!n) return reply.code(404).send({ erro: 'notificação inexistente' });
  n.read = true;
  return n;
});

/* --------------------------------- ponto --------------------------------- */

app.get('/v1/ponto', async () => db.ponto);

/**
 * O carimbo do ponto é SEMPRE em horário de Brasília, nunca no fuso do
 * processo. `getHours()` lê o fuso do servidor -- que em container é UTC, e
 * gravaria 17:32 num ponto batido as 14:32. A jornada contratual do
 * colaborador é em horário de Brasília, então é esse o único fuso correto
 * aqui, independente de onde o BFF rode.
 */
const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

app.post('/v1/ponto/registros', async () => {
  const time = brasiliaTime.format(new Date());
  const kind = db.ponto.hoje.length % 2 === 0 ? 'entrada' : 'saída';
  const entry = { hora: time, tipo: kind };
  db.ponto.hoje.push(entry);
  return entry;
});

app.post('/v1/ponto/justificativas', async (req, reply) => {
  const { dia, motivo } = req.body ?? {};
  if (!dia || !motivo) return reply.code(400).send({ erro: 'dia e motivo são obrigatórios' });
  const created = { id: `j${db.ponto.justificativas.length + 1}`, dia, motivo, situacao: 'pendente' };
  db.ponto.justificativas.unshift(created);
  return created;
});

/* ------------------------------- benefícios ------------------------------ */

app.get('/v1/beneficios', async () => db.beneficios);

app.get('/v1/beneficios/reembolsos', async () => db.reembolsos);

app.post('/v1/beneficios/reembolsos', async (req, reply) => {
  const { descricao, valor } = req.body ?? {};
  if (!descricao || !valor) return reply.code(400).send({ erro: 'descrição e valor são obrigatórios' });
  const created = {
    id: `RB-${4822 + db.reembolsos.length}`,
    descricao,
    valor,
    situacao: 'em análise',
    enviadoEm: new Date().toLocaleDateString('pt-BR')
  };
  db.reembolsos.unshift(created);
  return created;
});

app.post('/v1/beneficios/:id/solicitacoes', async (req, reply) => {
  const benefit = db.beneficios.find((b) => b.id === req.params.id);
  if (!benefit) return reply.code(404).send({ erro: 'benefício inexistente' });
  const protocol = `SB-${String(9100 + db.solicitacoesBeneficio.length)}`;
  db.solicitacoesBeneficio.push({
    protocolo: protocol, beneficioId: benefit.id, tipo: req.body?.tipo ?? 'alteracao', cid: req.cid
  });
  return { protocolo: protocol, beneficioId: benefit.id };
});

/* -------------------------------- holerite ------------------------------- */

app.get('/v1/holerite', async () => db.holerite);

/**
 * Documento do demonstrativo.
 *
 * O BFF entrega o arquivo já materializado, e não a URL do sistema de folha.
 * Motivo: a URL do SAP/Protheus carrega token e identificador interno -- expor
 * isso ao browser transforma uma questão de UI numa questão de segurança.
 * Aqui o conteúdo é simulado; em produção seria o PDF assinado pela folha.
 */
app.get('/v1/holerite/:competencia/documento', async (req, reply) => {
  const d = db.holerite.demonstrativos.find((x) => x.competencia === req.params.competencia);
  if (!d) return reply.code(404).send({ erro: 'competência inexistente' });
  const text = [
    'DEMONSTRATIVO DE PAGAMENTO',
    `Colaborador: ${db.user.name} - matrícula ${db.user.registration}`,
    `Competência: ${d.referencia}`,
    '',
    ...d.linhas.map((l) => `${l.tipo === 'provento' ? '+' : '-'} ${l.descricao}: ${l.valor}`),
    '',
    `Total de proventos: ${d.bruto}`,
    `Total de descontos: ${d.descontos}`,
    `Líquido a receber: ${d.liquido}`
  ].join('\n');
  return {
    nomeArquivo: `holerite-${d.competencia}.txt`,
    mimeType: 'text/plain;charset=utf-8',
    conteudoBase64: Buffer.from(text, 'utf8').toString('base64')
  };
});

/** Coletor de telemetria. Em produção: OTLP -> Collector -> backend de observabilidade. */
app.post('/v1/telemetry', async (req, reply) => {
  for (const r of req.body ?? []) {
    app.log.info(
      { cid: r.correlationId, journey: r.journeyId, squad: r.squad, v: r.version, props: r.props },
      `[telemetry:${r.type}] ${r.name}`
    );
  }
  reply.code(204);
});

/**
 * Higiene do índice de busca, checada no boot.
 *
 * Agora que a participação é declarada, esquecer `capabilities: ['search']` faz
 * os resultados da jornada sumirem -- sem erro, sem log, sem nada. É o mesmo
 * formato de falha do `--pp-space-4` que custou caro no DS: não quebra, não
 * avisa, só para de funcionar. Então avisamos.
 *
 * O contrário também é ruído: jornada que declara `search` e não publicou
 * nenhuma entrada aparece como participante e nunca devolve resultado.
 */
function checkSearchIndex() {
  const journeys = loadRegistry();
  const declared = new Set(journeys.filter((j) => j.capabilities.includes('search')).map((j) => j.id));
  const indexed = new Set(db.searchIndex.map((h) => h.journeyId));

  const missingCapability = [...indexed].filter((id) => !declared.has(id));
  const missingEntries = [...declared].filter((id) => !indexed.has(id));

  if (missingCapability.length) {
    app.log.warn(
      { journeys: missingCapability },
      'Índice de busca: publicam entradas mas NÃO declaram capabilities:["search"] — os resultados delas não vão aparecer'
    );
  }
  if (missingEntries.length) {
    app.log.warn(
      { journeys: missingEntries },
      'Índice de busca: declaram capabilities:["search"] mas não publicaram nenhuma entrada'
    );
  }
}

checkSearchIndex();

await app.listen({ port: 4000, host: '0.0.0.0' });
