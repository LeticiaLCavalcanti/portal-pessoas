/**
 * ============================================================================
 *  BFF do Portal Pessoas
 * ============================================================================
 *
 * Por que existe um BFF (e nao chamadas diretas as APIs de dominio):
 *  1. AGREGACAO: a home precisa de 5 sistemas legados. Fazer isso no browser
 *     custa 5 round-trips no 4G do colaborador em campo.
 *  2. CONTRATO ESTAVEL: o legado muda de forma e ritmo proprios. O BFF absorve
 *     essa instabilidade para que a jornada nao precise ser reescrita junto.
 *  3. SEGREDO E TOKEN: troca de token, escopos e credenciais de sistema ficam
 *     no servidor.
 *  4. REGISTRO DE JORNADAS: e o que permite publicar jornada sem tocar no shell.
 *
 * Risco assumido: o BFF pode virar um novo monolito compartilhado por 10 squads.
 * Mitigacao (ver docs/01-proposta-tecnica.md): um modulo por dominio, com
 * CODEOWNERS por pasta, e evolucao para GraphQL Federation quando o custo de
 * coordenacao superar o custo operacional de N subgraphs.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as db from './data.js';
import { casar } from './busca.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });
await app.register(cors, { origin: true, exposedHeaders: ['x-correlation-id'] });

/** Propaga o correlation-id vindo do shell. Um id por sessao, ponta a ponta. */
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
 * Catalogo de jornadas visiveis para ESTE colaborador.
 * O BFF ja poda por papel; o rollout percentual e resolvido no cliente para
 * servir tambem de kill-switch local quando o remote falha.
 */
/**
 * Uma unica definicao de "o que este colaborador enxerga".
 *
 * Existe como funcao, e nao repetida em cada rota, porque a busca precisa da
 * MESMA poda: um resultado de busca que leva a uma jornada fora do catalogo do
 * colaborador e um beco sem saida -- o shell nao acha a rota e desenha erro.
 * Enquanto isso era um filtro copiado, o catalogo podava por papel e a busca
 * nao.
 */
const jornadasVisiveisPara = (roles) =>
  loadRegistry().filter(
    (j) => j.requiredRoles.length === 0 || j.requiredRoles.some((r) => roles.has(r))
  );

app.get('/v1/journeys', async () => jornadasVisiveisPara(new Set(db.user.roles)));

app.get('/v1/home', async () => ({
  greeting: `Bom te ver, ${db.user.firstName}`,
  cards: db.homeCards
}));

/**
 * Busca global: fan-out por dominio com timeout curto e degradacao parcial.
 *
 * A PARTICIPACAO NA BUSCA E DECLARADA NO MANIFESTO, nao no codigo do BFF.
 * `capabilities: ['search']` e o que coloca uma jornada no resultado -- e uma
 * jornada que nao declara simplesmente nao aparece, sem que ninguem edite este
 * arquivo. E o mecanismo que a ADR 0009 descreve; ate esta funcao existir, a
 * ADR estava certa no papel e o indice era consultado inteiro, incluindo
 * jornada que nao havia pedido para participar.
 *
 * A poda por papel vem junto de graca, porque a fonte e o catalogo visivel e
 * nao o registro cru.
 */
app.get('/v1/search', async (req) => {
  const consulta = String(req.query.q ?? '').trim();

  const participantes = new Set(
    jornadasVisiveisPara(new Set(db.user.roles))
      .filter((j) => j.capabilities.includes('search'))
      .map((j) => j.id)
  );

  // O casamento ignora acento -- ver busca.js. Num portal em portugues, quem
  // digita rapido escreve "ferias", e a comparacao literal devolvia zero.
  return { query: consulta, hits: casar(db.searchIndex, consulta, participantes) };
});

app.get('/v1/notifications', async () => db.notifications);

/**
 * Marcar como lida.
 *
 * Existe porque o contador de avisos precisa reagir ao clique. Um badge que
 * nunca zera treina o colaborador a ignorar a notificacao -- e a partir dai
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
 * O carimbo do ponto e SEMPRE em horario de Brasilia, nunca no fuso do
 * processo. `getHours()` le o fuso do servidor -- que em container e UTC, e
 * gravaria 17:32 num ponto batido as 14:32. A jornada contratual do
 * colaborador e em horario de Brasilia, entao e esse o unico fuso correto
 * aqui, independente de onde o BFF rode.
 */
const horaDeBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

app.post('/v1/ponto/registros', async () => {
  const hora = horaDeBrasilia.format(new Date());
  const tipo = db.ponto.hoje.length % 2 === 0 ? 'entrada' : 'saída';
  db.ponto.hoje.push({ hora, tipo });
  return { hora, tipo };
});

app.post('/v1/ponto/justificativas', async (req, reply) => {
  const { dia, motivo } = req.body ?? {};
  if (!dia || !motivo) return reply.code(400).send({ erro: 'dia e motivo são obrigatórios' });
  const criada = { id: `j${db.ponto.justificativas.length + 1}`, dia, motivo, situacao: 'pendente' };
  db.ponto.justificativas.unshift(criada);
  return criada;
});

/* ------------------------------- beneficios ------------------------------ */

app.get('/v1/beneficios', async () => db.beneficios);

app.get('/v1/beneficios/reembolsos', async () => db.reembolsos);

app.post('/v1/beneficios/reembolsos', async (req, reply) => {
  const { descricao, valor } = req.body ?? {};
  if (!descricao || !valor) return reply.code(400).send({ erro: 'descrição e valor são obrigatórios' });
  const criado = {
    id: `RB-${4822 + db.reembolsos.length}`,
    descricao,
    valor,
    situacao: 'em análise',
    enviadoEm: new Date().toLocaleDateString('pt-BR')
  };
  db.reembolsos.unshift(criado);
  return criado;
});

app.post('/v1/beneficios/:id/solicitacoes', async (req, reply) => {
  const beneficio = db.beneficios.find((b) => b.id === req.params.id);
  if (!beneficio) return reply.code(404).send({ erro: 'benefício inexistente' });
  const protocolo = `SB-${String(9100 + db.solicitacoesBeneficio.length)}`;
  db.solicitacoesBeneficio.push({
    protocolo, beneficioId: beneficio.id, tipo: req.body?.tipo ?? 'alteracao', cid: req.cid
  });
  return { protocolo, beneficioId: beneficio.id };
});

/* -------------------------------- holerite ------------------------------- */

app.get('/v1/holerite', async () => db.holerite);

/**
 * Documento do demonstrativo.
 *
 * O BFF entrega o arquivo ja materializado, e nao a URL do sistema de folha.
 * Motivo: a URL do SAP/Protheus carrega token e identificador interno -- expor
 * isso ao browser transforma uma questao de UI numa questao de seguranca.
 * Aqui o conteudo e simulado; em producao seria o PDF assinado pela folha.
 */
app.get('/v1/holerite/:competencia/documento', async (req, reply) => {
  const d = db.holerite.demonstrativos.find((x) => x.competencia === req.params.competencia);
  if (!d) return reply.code(404).send({ erro: 'competência inexistente' });
  const texto = [
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
    conteudoBase64: Buffer.from(texto, 'utf8').toString('base64')
  };
});

/** Coletor de telemetria. Em producao: OTLP -> Collector -> backend de observabilidade. */
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
 * Higiene do indice de busca, checada no boot.
 *
 * Agora que a participacao e declarada, esquecer `capabilities: ['search']` faz
 * os resultados da jornada sumirem -- sem erro, sem log, sem nada. E o mesmo
 * formato de falha do `--pp-space-4` que custou caro no DS: nao quebra, nao
 * avisa, so para de funcionar. Entao avisamos.
 *
 * O contrario tambem e ruido: jornada que declara `search` e nao publicou
 * nenhuma entrada aparece como participante e nunca devolve resultado.
 */
function conferirIndiceDeBusca() {
  const jornadas = loadRegistry();
  const declaram = new Set(jornadas.filter((j) => j.capabilities.includes('search')).map((j) => j.id));
  const indexam = new Set(db.searchIndex.map((h) => h.journeyId));

  const semDeclarar = [...indexam].filter((id) => !declaram.has(id));
  const semIndice = [...declaram].filter((id) => !indexam.has(id));

  if (semDeclarar.length) {
    app.log.warn(
      { jornadas: semDeclarar },
      'Indice de busca: publicam entradas mas NAO declaram capabilities:["search"] -- os resultados delas nao vao aparecer'
    );
  }
  if (semIndice.length) {
    app.log.warn(
      { jornadas: semIndice },
      'Indice de busca: declaram capabilities:["search"] mas nao publicaram nenhuma entrada'
    );
  }
}

conferirIndiceDeBusca();

await app.listen({ port: 4000, host: '0.0.0.0' });
