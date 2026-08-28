/**
 * ============================================================================
 *  Jornada: Benefícios  |  dona: squad-beneficios
 * ============================================================================
 *
 * Três coisas que esta jornada exercita do contrato:
 *  - ROTA INTERNA: `ctx.navigate` + `ctx.onPathChange` (voltar e deep link).
 *  - TEMA: não lê nem armazena tema; o DS repinta por custom property.
 *    `onThemeChange` só serve ao que depende de JS (canvas, por exemplo).
 *  - FLAG: `beneficios.reembolso-v2` chega pronta em `ctx.flags` -- a squad não
 *    instância SDK de feature flag (docs/adr/0002).
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { JourneyContext, JourneyModule } from '@portal/journey-contract';
import {
  Badge, Button, Card, DataList, EmptyState, ErrorBoundary, Field, Row, Skeleton, Stack, Text
} from '@portal/design-system';

interface Benefit { id: string; nome: string; valor: string; detalhe: string; status: string }
interface Refund { id: string; descricao: string; valor: string; situacao: string; enviadoEm: string }

function Screen({ ctx }: { ctx: JourneyContext }) {
  const [items, setItems] = React.useState<Benefit[] | null>(null);
  const [path, setPath] = React.useState(ctx.path);

  React.useEffect(() => ctx.onPathChange(setPath), [ctx]);

  React.useEffect(() => {
    ctx.telemetry.event('beneficios.tela_aberta');
    ctx.http.get<Benefit[]>('/v1/beneficios').then(setItems).catch((e) => ctx.telemetry.error(e));
  }, [ctx]);

  if (!items) return <Stack gap={3}><Skeleton h={120} /><Skeleton h={120} /></Stack>;

  const section = path.replace(/^\//, '').replace(/\/+$/, '');

  // Rota própria da jornada, e não um id de benefício. Vem da busca global do
  // portal ("Solicitar reembolso") e do card de detalhe.
  if (section === 'reembolso') return <Refunds ctx={ctx} />;

  const selected = items.find((b) => b.id === section);

  if (section && !selected) {
    return (
      <Card>
        <EmptyState
          mark="[ ? ]"
          title="Benefício não encontrado"
          description={`Não existe um benefício com o identificador "${section}".`}
          action={<Button onClick={() => ctx.navigate('/beneficios')}>Voltar para a lista</Button>}
        />
      </Card>
    );
  }

  if (selected) return <Detail ctx={ctx} benefit={selected} />;

  return (
    <Stack gap={4}>
      <Row gap={3} style={{ flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => ctx.navigate('/beneficios/reembolso')}>
          Solicitar reembolso
        </Button>
      </Row>
      <div className="ds-grid">
        {items.map((b) => (
          /*
            A ação do card é `primary` e vai no `footer`, igual a da home. Antes
            ela era `secondary` e ficava dentro do Stack -- então esticava pela
            largura do card e parava no fim do texto. Card em grade é sempre o
            mesmo objeto, na home ou na jornada: mesma anatomia, mesma ênfase.
          */
          <Card
            key={b.id}
            title={b.nome}
            hint={b.detalhe}
            footer={
              <Button onClick={() => {
                ctx.telemetry.event('beneficios.detalhe_aberto', { beneficio: b.id });
                ctx.navigate(`/beneficios/${b.id}`);
              }}>
                Ver detalhes
              </Button>
            }
          >
            <Stack gap={4}>
              <Text size="lg">{b.valor}</Text>
            </Stack>
          </Card>
        ))}
      </div>
    </Stack>
  );
}

function Detail({
  ctx, benefit
}: { ctx: JourneyContext; benefit: Benefit }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [protocol, setProtocol] = React.useState<string | null>(null);

  const request = async () => {
    setSubmitting(true);
    try {
      // O botão chama o BFF de verdade e devolve protocolo. Um botão que só
      // dispara um toast otimista é indistinguível de um botão quebrado no dia
      // em que o backend cai.
      const r = await ctx.http.post<{ protocolo: string }>(
        `/v1/beneficios/${benefit.id}/solicitacoes`, { tipo: 'alteracao' }
      );
      setProtocol(r.protocolo);
      ctx.notify(`Solicitação ${r.protocolo} enviada para análise.`, 'success');
      ctx.telemetry.event('beneficios.solicitacao_enviada', { benefit: benefit.id });
    } catch (e) {
      ctx.telemetry.error(e, { action: 'request', benefit: benefit.id });
      ctx.notify('Não foi possível enviar a solicitação agora.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap={4}>
      <Button variant="ghost" onClick={() => ctx.navigate('/beneficios')}>← Todos os benefícios</Button>
      <Card title={benefit.nome} hint={benefit.detalhe}>
        <DataList
          items={[
            { label: 'Situação', value: <Badge tone="success">{benefit.status}</Badge> },
            { label: 'Valor ou plano', value: benefit.valor },
            ...(protocol ? [{ label: 'Protocolo', value: protocol }] : [])
          ]}
        />
        <Row gap={3} style={{ marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
          <Button onClick={request} disabled={submitting}>
            {submitting ? 'Enviando…' : 'Solicitar alteração'}
          </Button>
          <Button variant="secondary" onClick={() => ctx.navigate('/beneficios/reembolso')}>
            Pedir reembolso
          </Button>
        </Row>
      </Card>
    </Stack>
  );
}

function Refunds({ ctx }: { ctx: JourneyContext }) {
  const [list, setList] = React.useState<Refund[] | null>(null);
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  /**
   * A flag não esconde a tela -- ela troca o FLUXO. Com v2 desligada, o
   * colaborador cai no formulário antigo em vez de ver um botão morto. Flag que
   * apaga a saída sem oferecer alternativa é como não ter a funcionalidade.
   */
  const v2 = ctx.flags['beneficios.reembolso-v2'] === true;

  React.useEffect(() => {
    ctx.telemetry.event('beneficios.reembolso_aberto', { version: v2 ? 'v2' : 'v1' });
    ctx.http.get<Refund[]>('/v1/beneficios/reembolsos').then(setList).catch((e) => {
      ctx.telemetry.error(e);
      setList([]);
    });
  }, [ctx, v2]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount.trim()) {
      ctx.notify('Preencha a descrição e o valor do reembolso.', 'danger');
      return;
    }
    setSubmitting(true);
    try {
      const created = await ctx.http.post<Refund>('/v1/beneficios/reembolsos', { descricao: description, valor: amount });
      setList((l) => [created, ...(l ?? [])]);
      setDescription(''); setAmount('');
      ctx.notify(`Reembolso ${created.id} enviado para análise.`, 'success');
      ctx.telemetry.event('beneficios.reembolso_enviado', { amount });
    } catch (err) {
      ctx.telemetry.error(err, { action: 'refund' });
      ctx.notify('Não foi possível enviar o reembolso agora.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap={4}>
      <Button variant="ghost" onClick={() => ctx.navigate('/beneficios')}>← Todos os benefícios</Button>

      <Card
        title="Solicitar reembolso"
        hint={v2
          ? 'Fluxo novo: análise automática para valores até R$ 500,00.'
          : 'Fluxo anterior: análise manual pelo RH em até 5 dias úteis.'}
        actions={<Badge tone={v2 ? 'accent' : undefined}>{v2 ? 'v2' : 'v1'}</Badge>}
      >
        <form onSubmit={submit}>
          <Stack gap={4}>
            <Field
              label="Descrição" placeholder="Consulta odontológica"
              value={description} onChange={(ev) => setDescription(ev.target.value)}
            />
            <Field
              label="Valor" placeholder="R$ 214,90" inputMode="decimal"
              value={amount} onChange={(ev) => setAmount(ev.target.value)}
            />
            <Row>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enviando…' : 'Enviar reembolso'}
              </Button>
            </Row>
          </Stack>
        </form>
      </Card>

      <Card title="Reembolsos recentes">
        {list === null ? (
          <Skeleton h={80} />
        ) : list.length === 0 ? (
          <EmptyState mark="[ - ]" title="Nenhum reembolso" description="Você ainda não pediu reembolso este ano." />
        ) : (
          <DataList
            items={list.map((r) => ({
              label: `${r.enviadoEm} · ${r.descricao}`,
              value: (
                <>
                  {r.valor}{' '}
                  <Badge tone={r.situacao === 'aprovado' ? 'success' : 'warn'}>{r.situacao}</Badge>
                </>
              )
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
    let root: Root | null = createRoot(container);
    root.render(
      <ErrorBoundary onError={(e) => ctx.fail(e)}>
        <Screen ctx={ctx} />
      </ErrorBoundary>
    );

    /**
     * Desmonte obrigatório: sem ele o portal vaza uma árvore a cada navegação.
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
