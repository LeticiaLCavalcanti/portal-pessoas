/**
 * ============================================================================
 *  Jornada: Registro de ponto  |  dona: squad-jornada-trabalho
 * ============================================================================
 *
 * A squad controla tudo daqui pra dentro: stack, estado, rotas internas,
 * cadencia de deploy. O unico compromisso com o portal e este arquivo --
 * exportar um objeto que cumpre `JourneyModule`.
 *
 * A jornada e DONA de tudo abaixo de /ponto. O shell entrega `ctx.path` (a
 * rota relativa) e avisa por `ctx.onPathChange` quando ela muda -- inclusive
 * quando a mudanca veio do "voltar" do navegador ou de um resultado da busca
 * global. Sem tratar isso, um deep link para /ponto/espelho abriria a tela
 * inicial da jornada e o clique do colaborador nao teria efeito visivel.
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
// A folha da squad viaja junto do bundle federado -- o shell nao a conhece.
import './journey.css';
import type { JourneyContext, JourneyModule } from '@portal/journey-contract';
import {
  Badge, Button, Card, DataList, EmptyState, ErrorBoundary, Field, Icon, Row,
  Skeleton, Stack, Tabs, Text
} from '@portal/design-system';

interface Registro { hora: string; tipo: string }
interface Ponto {
  hoje: Registro[];
  saldoBancoHoras: string;
  jornadaPrevista: string;
  espelho: { dia: string; entrada: string; saida: string; saldo: string; situacao: string }[];
  banco: { mes: string; credito: string; debito: string; saldo: string }[];
  justificativas: { id: string; dia: string; motivo: string; situacao: string }[];
}

/** Rotas internas da jornada. O shell nao conhece nenhuma delas. */
const ABAS = [
  { path: '/', label: 'Hoje' },
  { path: '/espelho', label: 'Espelho de ponto' },
  { path: '/banco', label: 'Banco de horas' },
  { path: '/justificativas', label: 'Justificar ausência' }
] as const;

/**
 * Relogio da tela de bater ponto.
 *
 * Numa tela de registro de ponto o horario e a informacao mais importante:
 * antes de clicar, o colaborador quer conferir QUE HORAS vao ser gravadas.
 * Sem ele, so se descobre depois, no toast.
 *
 * Ressalva honesta, e por isso o texto abaixo diz "horario do seu
 * dispositivo": este e o relogio do BROWSER. A marcacao que vale e a que o BFF
 * carimba, com o relogio do servidor -- e e assim que tem de ser, senao daria
 * para adiantar o ponto mexendo no relogio do computador. Os dois normalmente
 * batem; quando divergirem, quem manda e o servidor.
 */
function Relogio() {
  const [agora, setAgora] = React.useState(() => new Date());

  React.useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hora = agora.toLocaleTimeString('pt-BR', { hour12: false });
  const data = agora.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  });

  return (
    <div className="ponto-relogio">
      <Icon name="clock" size={22} />
      <div>
        {/*
          `aria-hidden` no numero e um rotulo estatico ao lado: um leitor de
          tela anunciando o relogio a cada segundo tornaria a tela inutilizavel.
          Quem precisa do horario exato tem o <time dateTime> abaixo.
        */}
        <time className="ponto-relogio__hora" dateTime={agora.toISOString()} aria-hidden>
          {hora}
        </time>
        <Text size="xs" tone="subtle" className="ponto-relogio__data">
          {data} · horário do seu dispositivo
        </Text>
      </div>
    </div>
  );
}

function normalizar(p: string) {
  const limpo = p.replace(/\/+$/, '') || '/';
  return ABAS.some((a) => a.path === limpo) ? limpo : '/';
}

function Tela({ ctx }: { ctx: JourneyContext }) {
  const [dados, setDados] = React.useState<Ponto | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [quebrar, setQuebrar] = React.useState(false);
  const [path, setPath] = React.useState(() => normalizar(ctx.path));

  // Deep link e "voltar" do navegador entram por aqui.
  React.useEffect(() => ctx.onPathChange((p) => setPath(normalizar(p))), [ctx]);

  React.useEffect(() => {
    ctx.telemetry.event('ponto.tela_aberta');
    ctx.http.get<Ponto>('/v1/ponto').then(setDados).catch((e) => ctx.telemetry.error(e));
  }, [ctx]);

  // Demonstracao proposital de isolamento de falha: o portal continua de pe.
  if (quebrar) throw new Error('Falha simulada dentro da jornada de ponto');

  const registrar = async () => {
    setEnviando(true);
    try {
      const r = await ctx.http.post<Registro>('/v1/ponto/registros', {});
      setDados((d) => (d ? { ...d, hoje: [...d.hoje, r] } : d));
      ctx.notify(`Ponto de ${r.tipo} registrado às ${r.hora}.`, 'success');
      ctx.telemetry.event('ponto.registrado', { tipo: r.tipo });
    } catch (e) {
      ctx.telemetry.error(e, { acao: 'registrar' });
      ctx.notify('Não foi possível registrar o ponto agora.', 'danger');
    } finally {
      setEnviando(false);
    }
  };

  if (!dados) return <Stack gap={3}><Skeleton h={90} /><Skeleton h={140} /></Stack>;

  const abas = (
    <Tabs
      label="Seções de registro de ponto"
      current={path}
      items={ABAS.map((a) => ({ id: a.path, label: a.label }))}
      onSelect={(id) => {
        ctx.telemetry.event('ponto.aba_aberta', { aba: id });
        ctx.navigate(id === '/' ? '/ponto' : `/ponto${id}`);
      }}
    />
  );

  return (
    <Stack gap={4}>
      {abas}

      {path === '/' && (
        <>
          <Card
            title="Hoje"
            hint={`Jornada prevista de ${dados.jornadaPrevista}`}
            actions={<Badge tone={dados.saldoBancoHoras.startsWith('+') ? 'success' : 'warn'}>
              banco {dados.saldoBancoHoras}
            </Badge>}
          >
            <Stack gap={4}>
              <Relogio />
              <Row gap={2} style={{ flexWrap: 'wrap' }}>
                {dados.hoje.map((r, i) => (
                  <span key={`${r.hora}-${i}`} className="ds-badge">{r.hora} · {r.tipo}</span>
                ))}
              </Row>
              <Row gap={3} style={{ flexWrap: 'wrap' }}>
                <Button onClick={registrar} disabled={enviando}>
                  {enviando ? 'Registrando…' : 'Registrar ponto'}
                </Button>
                {ctx.flags['ponto.registro-por-geolocalizacao'] && (
                  <Text size="xs" tone="subtle">Localização será conferida no registro.</Text>
                )}
              </Row>
            </Stack>
          </Card>

          <Card title="Resumo da semana">
            <DataList
              items={[
                { label: 'Horas trabalhadas', value: '36h12' },
                { label: 'Horas previstas', value: '40h00' },
                {
                  label: 'Ajustes pendentes',
                  value: (
                    <Badge tone="warn">
                      {dados.justificativas.filter((j) => j.situacao === 'pendente').length}
                    </Badge>
                  )
                }
              ]}
            />
          </Card>
        </>
      )}

      {path === '/espelho' && (
        <Card title="Espelho de ponto" hint="Marcações dos últimos dias úteis.">
          <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr><th>Dia</th><th>Entrada</th><th>Saída</th><th>Saldo</th><th>Situação</th></tr>
            </thead>
            <tbody>
              {dados.espelho.map((d) => (
                <tr key={d.dia}>
                  <td>{d.dia}</td><td>{d.entrada}</td><td>{d.saida}</td><td>{d.saldo}</td>
                  <td>
                    <Badge tone={d.situacao === 'ok' ? 'success' : 'warn'}>{d.situacao}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {path === '/banco' && (
        <Card title="Banco de horas" hint={`Saldo atual ${dados.saldoBancoHoras}.`}>
          <DataList
            items={dados.banco.map((m) => ({
              label: m.mes,
              value: `+${m.credito} / -${m.debito} · saldo ${m.saldo}`
            }))}
          />
        </Card>
      )}

      {path === '/justificativas' && (
        <Justificativas ctx={ctx} dados={dados} onCriada={(j) =>
          setDados((d) => (d ? { ...d, justificativas: [j, ...d.justificativas] } : d))
        } />
      )}

      <Card title="Modo demonstração" hint="Recursos usados para provar a arquitetura no case.">
        <Row gap={3} style={{ flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setQuebrar(true)}>
            Quebrar esta jornada
          </Button>
          <Button variant="secondary" onClick={() => ctx.navigate('/beneficios')}>
            Navegar para Benefícios
          </Button>
          <Text size="xs" tone="subtle">
            Rota interna atual: <code>{path}</code>
          </Text>
        </Row>
      </Card>
    </Stack>
  );
}

function Justificativas({
  ctx, dados, onCriada
}: {
  ctx: JourneyContext;
  dados: Ponto;
  onCriada: (j: Ponto['justificativas'][number]) => void;
}) {
  const [dia, setDia] = React.useState('');
  const [motivo, setMotivo] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dia.trim() || !motivo.trim()) {
      ctx.notify('Informe o dia e o motivo da ausência.', 'danger');
      return;
    }
    setEnviando(true);
    try {
      const criada = await ctx.http.post<Ponto['justificativas'][number]>(
        '/v1/ponto/justificativas', { dia, motivo }
      );
      onCriada(criada);
      setDia(''); setMotivo('');
      ctx.notify('Justificativa enviada para o gestor.', 'success');
      ctx.telemetry.event('ponto.justificativa_enviada', { dia });
    } catch (err) {
      ctx.telemetry.error(err, { acao: 'justificar' });
      ctx.notify('Não foi possível enviar a justificativa.', 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Stack gap={4}>
      <Card title="Justificar ausência">
        <form onSubmit={enviar}>
          <Stack gap={4}>
            <Field
              label="Dia" placeholder="12/08/2026"
              value={dia} onChange={(e) => setDia(e.target.value)}
            />
            <Field
              label="Motivo" placeholder="Consulta médica"
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
            />
            <Row>
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar justificativa'}
              </Button>
            </Row>
          </Stack>
        </form>
      </Card>

      <Card title="Justificativas enviadas">
        {dados.justificativas.length === 0 ? (
          <EmptyState mark="[ - ]" title="Nenhuma justificativa" description="Nada pendente por aqui." />
        ) : (
          <DataList
            items={dados.justificativas.map((j) => ({
              label: `${j.dia} · ${j.motivo}`,
              value: <Badge tone={j.situacao === 'aprovada' ? 'success' : 'warn'}>{j.situacao}</Badge>
            }))}
          />
        )}
      </Card>
    </Stack>
  );
}

const journey: JourneyModule = {
  contractVersion: '1.1',
  mount(container, ctx) {
    /**
     * A jornada cria a PROPRIA raiz React. Como `react` e singleton
     * compartilhado via Module Federation, nao ha segunda copia da lib na
     * pagina -- so uma segunda arvore, isolada da arvore do shell.
     *
     * E porque a arvore e isolada que o error boundary tem de estar AQUI: o
     * boundary do shell nao enxerga erros desta raiz. Ele captura, avisa o
     * shell por `ctx.fail` e deixa o shell desenhar a tela degradada padrao.
     */
    let root: Root | null = createRoot(container);
    root.render(
      <ErrorBoundary onError={(e) => ctx.fail(e)}>
        <Tela ctx={ctx} />
      </ErrorBoundary>
    );

    /**
     * Desmonte obrigatorio: sem ele o portal vaza uma arvore a cada navegacao.
     *
     * O `queueMicrotask` nao e firula. O shell chama esta funcao de dentro do
     * cleanup de um efeito -- ou seja, com o React DELE no meio de um commit.
     * Chamar `root.unmount()` ali desmonta uma segunda raiz de forma sincrona
     * durante um render e o React avisa em dev ("Attempted to synchronously
     * unmount a root while React was already rendering"), com risco real de
     * race em producao. Adiar um microtask tira o desmonte do commit sem
     * atrasar nada de perceptivel.
     *
     * E um custo estrutural de duas raizes React na mesma pagina -- o preco de
     * o contrato ser `mount(HTMLElement)` e nao "devolva um componente React".
     * Pagamos por isso a liberdade de a squad trocar de framework.
     */
    return () => {
      const atual = root;
      root = null;
      queueMicrotask(() => atual?.unmount());
    };
  }
};

export default journey;
