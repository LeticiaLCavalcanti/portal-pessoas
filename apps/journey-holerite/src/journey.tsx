/**
 * ============================================================================
 *  Jornada: Holerite  |  dona: squad-remuneracao
 * ============================================================================
 *
 * Prova do requisito "incluir jornada sem alterar o core": nenhum arquivo de
 * `apps/shell` foi tocado para ela existir -- so uma linha em
 * `apps/bff/src/registry.json` (docs/adr/0004).
 *
 * Declara `fallbackJourneyId`: se este bundle cair, o shell oferece a versao
 * legada (docs/adr/0010).
 *
 * DUAS VERSOES DO DESIGN SYSTEM CONVIVEM AQUI, de proposito.
 * Este arquivo (`Screen` e `IncomeStatement`) segue na v1. `./Detail.tsx` ja esta na v2.
 * As duas telas renderizam na mesma arvore React e sao indistinguiveis, porque
 * as duas versoes leem os mesmos tokens L0 do IDS. E a migracao gradual da
 * ADR 0011 acontecendo em um diretorio de verdade -- nao um plano no papel.
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { JourneyContext, JourneyModule } from '@portal/journey-contract';
import {
  Badge, Button, Card, DataList, EmptyState, ErrorBoundary, Row, Skeleton, Stack, Text
} from '@portal/design-system';
import { Detail } from './Detail';
import type { Payroll } from './types';

function Screen({ ctx }: { ctx: JourneyContext }) {
  const [data, setData] = React.useState<Payroll | null>(null);
  const [path, setPath] = React.useState(ctx.path);

  React.useEffect(() => ctx.onPathChange(setPath), [ctx]);

  React.useEffect(() => {
    ctx.telemetry.event('holerite.tela_aberta');
    ctx.http.get<Payroll>('/v1/holerite').then(setData).catch((e) => ctx.telemetry.error(e));
  }, [ctx]);

  if (!data) return <Stack gap={3}><Skeleton h={110} /><Skeleton h={140} /></Stack>;

  const section = path.replace(/^\//, '').replace(/\/+$/, '');

  if (section === 'informe') return <IncomeStatement ctx={ctx} years={data.informeRendimentos} />;

  if (section) {
    const d = data.demonstrativos.find((x) => x.competencia === section);
    if (!d) {
      return (
        <Card>
          <EmptyState
            mark="[ ? ]"
            title="Demonstrativo não encontrado"
            description={`Não há demonstrativo para a competência "${section}".`}
            action={<Button onClick={() => ctx.navigate('/holerite')}>Voltar para a lista</Button>}
          />
        </Card>
      );
    }
    return <Detail ctx={ctx} d={d} />;
  }

  return (
    <Stack gap={4}>
      <Row gap={3} style={{ flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => ctx.navigate('/holerite/informe')}>
          Informe de rendimentos
        </Button>
      </Row>

      <div className="ds-grid">
        {data.demonstrativos.map((d) => (
          <Card
            key={d.competencia}
            title={d.referencia}
            hint={d.tipo === 'decimo-terceiro' ? 'Décimo terceiro salário' : 'Folha mensal'}
            actions={<Badge tone={d.situacao === 'pago' ? 'success' : 'accent'}>{d.situacao}</Badge>}
            footer={
              <Button onClick={() => {
                ctx.telemetry.event('holerite.detalhe_aberto', { competence: d.competencia });
                ctx.navigate(`/holerite/${d.competencia}`);
              }}>
                Ver demonstrativo
              </Button>
            }
          >
            <Stack gap={4}>
              <Text size="lg">{d.liquido}</Text>
              <Text size="xs" tone="subtle">bruto {d.bruto} · descontos {d.descontos}</Text>
            </Stack>
          </Card>
        ))}
      </div>
    </Stack>
  );
}

function IncomeStatement({ ctx, years }: { ctx: JourneyContext; years: { ano: string; situacao: string }[] }) {
  return (
    <Stack gap={4}>
      <Button variant="ghost" onClick={() => ctx.navigate('/holerite')}>← Todos os demonstrativos</Button>
      <Card title="Informe de rendimentos" hint="Documento anual para a declaração de imposto de renda.">
        <DataList
          items={years.map((a) => ({
            label: `Ano-calendário ${a.ano}`,
            value: (
              <Row gap={2} style={{ alignItems: 'center' }}>
                <Badge tone={a.situacao === 'disponível' ? 'success' : 'warn'}>{a.situacao}</Badge>
                {a.situacao === 'disponível' && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      ctx.telemetry.event('holerite.informe_solicitado', { year: a.ano });
                      ctx.notify(`Informe de ${a.ano} enviado para o seu e-mail corporativo.`, 'success');
                    }}
                  >
                    Enviar por e-mail
                  </Button>
                )}
              </Row>
            )
          }))}
        />
      </Card>
    </Stack>
  );
}

const journey: JourneyModule = {
  contractVersion: '1.1',
  mount(container, ctx) {
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
