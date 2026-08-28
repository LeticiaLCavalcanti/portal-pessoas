/**
 * ============================================================================
 *  Jornada: Registro de ponto  |  dona: squad-jornada-trabalho
 * ============================================================================
 *
 * A squad controla stack, estado, rotas internas e cadencia de deploy. O unico
 * compromisso com o portal e exportar um `JourneyModule` (docs/adr/0002).
 *
 * `ctx.path` + `ctx.onPathChange` cobrem deep link e "voltar" do navegador --
 * inclusive quando a rota veio da busca global (docs/adr/0009).
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

interface TimeEntry { hora: string; tipo: string }
interface TimeTracking {
  hoje: TimeEntry[];
  saldoBancoHoras: string;
  jornadaPrevista: string;
  espelho: { dia: string; entrada: string; saida: string; saldo: string; situacao: string }[];
  banco: { mes: string; credito: string; debito: string; saldo: string }[];
  justificativas: { id: string; dia: string; motivo: string; situacao: string }[];
}

/** Rotas internas da jornada. O shell nao conhece nenhuma delas. */
const TABS = [
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
 * O fuso e fixado em Brasilia, nao no do dispositivo: a jornada contratual do
 * colaborador e em horario de Brasilia, entao um colaborador viajando (ou com
 * o relogio do sistema em outro fuso) precisa ver a MESMA hora que vai ser
 * gravada. O BFF carimba no mesmo fuso, pelo mesmo motivo.
 *
 * Continua valendo que a marcacao oficial e a do servidor, e nao esta: senao
 * daria para adiantar o ponto mexendo no relogio do computador. A diferenca e
 * que agora os dois nao divergem por fuso -- so por desvio de relogio.
 */
const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

function Clock() {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('pt-BR', {
    hour12: false, timeZone: BRASILIA_TIME_ZONE
  });
  const date = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', timeZone: BRASILIA_TIME_ZONE
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
        <time className="ponto-relogio__hora" dateTime={now.toISOString()} aria-hidden>
          {time}
        </time>
        <Text size="xs" tone="subtle" className="ponto-relogio__data">
          {date} · horário de Brasília
        </Text>
      </div>
    </div>
  );
}

function normalizePath(p: string) {
  const clean = p.replace(/\/+$/, '') || '/';
  return TABS.some((t) => t.path === clean) ? clean : '/';
}

function Screen({ ctx }: { ctx: JourneyContext }) {
  const [data, setData] = React.useState<TimeTracking | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [crash, setCrash] = React.useState(false);
  const [path, setPath] = React.useState(() => normalizePath(ctx.path));

  // Deep link e "voltar" do navegador entram por aqui.
  React.useEffect(() => ctx.onPathChange((p) => setPath(normalizePath(p))), [ctx]);

  React.useEffect(() => {
    ctx.telemetry.event('ponto.tela_aberta');
    ctx.http.get<TimeTracking>('/v1/ponto').then(setData).catch((e) => ctx.telemetry.error(e));
  }, [ctx]);

  // Demonstracao proposital de isolamento de falha: o portal continua de pe.
  if (crash) throw new Error('Falha simulada dentro da jornada de ponto');

  const register = async () => {
    setSubmitting(true);
    try {
      const entry = await ctx.http.post<TimeEntry>('/v1/ponto/registros', {});
      setData((d) => (d ? { ...d, hoje: [...d.hoje, entry] } : d));
      ctx.notify(`Ponto de ${entry.tipo} registrado às ${entry.hora}.`, 'success');
      ctx.telemetry.event('ponto.registrado', { type: entry.tipo });
    } catch (e) {
      ctx.telemetry.error(e, { action: 'register' });
      ctx.notify('Não foi possível registrar o ponto agora.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) return <Stack gap={3}><Skeleton h={90} /><Skeleton h={140} /></Stack>;

  const tabs = (
    <Tabs
      label="Seções de registro de ponto"
      current={path}
      items={TABS.map((t) => ({ id: t.path, label: t.label }))}
      onSelect={(id) => {
        ctx.telemetry.event('ponto.aba_aberta', { tab: id });
        ctx.navigate(id === '/' ? '/ponto' : `/ponto${id}`);
      }}
    />
  );

  return (
    <Stack gap={4}>
      {tabs}

      {path === '/' && (
        <>
          <Card
            title="Hoje"
            hint={`Jornada prevista de ${data.jornadaPrevista}`}
            actions={<Badge tone={data.saldoBancoHoras.startsWith('+') ? 'success' : 'warn'}>
              banco {data.saldoBancoHoras}
            </Badge>}
          >
            <Stack gap={4}>
              <Clock />
              <Row gap={2} style={{ flexWrap: 'wrap' }}>
                {data.hoje.map((entry, i) => (
                  <span key={`${entry.hora}-${i}`} className="ds-badge">{entry.hora} · {entry.tipo}</span>
                ))}
              </Row>
              <Row gap={3} style={{ flexWrap: 'wrap' }}>
                <Button onClick={register} disabled={submitting}>
                  {submitting ? 'Registrando…' : 'Registrar ponto'}
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
                      {data.justificativas.filter((j) => j.situacao === 'pendente').length}
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
              {data.espelho.map((d) => (
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
        <Card title="Banco de horas" hint={`Saldo atual ${data.saldoBancoHoras}.`}>
          <DataList
            items={data.banco.map((m) => ({
              label: m.mes,
              value: `+${m.credito} / -${m.debito} · saldo ${m.saldo}`
            }))}
          />
        </Card>
      )}

      {path === '/justificativas' && (
        <Justifications ctx={ctx} data={data} onCreated={(j) =>
          setData((d) => (d ? { ...d, justificativas: [j, ...d.justificativas] } : d))
        } />
      )}

      <Card title="Modo demonstração" hint="Recursos usados para provar a arquitetura no case.">
        <Row gap={3} style={{ flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setCrash(true)}>
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

function Justifications({
  ctx, data, onCreated
}: {
  ctx: JourneyContext;
  data: TimeTracking;
  onCreated: (j: TimeTracking['justificativas'][number]) => void;
}) {
  const [day, setDay] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day.trim() || !reason.trim()) {
      ctx.notify('Informe o dia e o motivo da ausência.', 'danger');
      return;
    }
    setSubmitting(true);
    try {
      const created = await ctx.http.post<TimeTracking['justificativas'][number]>(
        '/v1/ponto/justificativas', { dia: day, motivo: reason }
      );
      onCreated(created);
      setDay(''); setReason('');
      ctx.notify('Justificativa enviada para o gestor.', 'success');
      ctx.telemetry.event('ponto.justificativa_enviada', { day });
    } catch (err) {
      ctx.telemetry.error(err, { action: 'justify' });
      ctx.notify('Não foi possível enviar a justificativa.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap={4}>
      <Card title="Justificar ausência">
        <form onSubmit={submit}>
          <Stack gap={4}>
            <Field
              label="Dia" placeholder="12/08/2026"
              value={day} onChange={(e) => setDay(e.target.value)}
            />
            <Field
              label="Motivo" placeholder="Consulta médica"
              value={reason} onChange={(e) => setReason(e.target.value)}
            />
            <Row>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enviando…' : 'Enviar justificativa'}
              </Button>
            </Row>
          </Stack>
        </form>
      </Card>

      <Card title="Justificativas enviadas">
        {data.justificativas.length === 0 ? (
          <EmptyState mark="[ - ]" title="Nenhuma justificativa" description="Nada pendente por aqui." />
        ) : (
          <DataList
            items={data.justificativas.map((j) => ({
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
        <Screen ctx={ctx} />
      </ErrorBoundary>
    );

    /**
     * Desmonte obrigatorio: sem ele o portal vaza uma arvore a cada navegacao.
     *
     * O `queueMicrotask` tira o desmonte do commit do React do shell -- sem
     * ele, "Attempted to synchronously unmount a root while React was already
     * rendering", com risco de race. Ver docs/adr/0007, "Nota relacionada".
     */
    return () => {
      const current = root;
      root = null;
      queueMicrotask(() => current?.unmount());
    };
  }
};

export default journey;
