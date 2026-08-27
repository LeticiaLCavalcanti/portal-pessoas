/**
 * ============================================================================
 *  Jornada: Beneficios  |  dona: squad-beneficios
 * ============================================================================
 *
 * Tres coisas que esta jornada exercita do contrato:
 *  - ROTA INTERNA: `ctx.navigate` + `ctx.onPathChange` (voltar e deep link).
 *  - TEMA: nao le nem armazena tema; o DS repinta por custom property.
 *    `onThemeChange` so serve ao que depende de JS (canvas, por exemplo).
 *  - FLAG: `beneficios.reembolso-v2` chega pronta em `ctx.flags` -- a squad nao
 *    instancia SDK de feature flag (docs/adr/0002).
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { JourneyContext, JourneyModule } from '@portal/journey-contract';
import {
  Badge, Button, Card, DataList, EmptyState, ErrorBoundary, Field, Row, Skeleton, Stack, Text
} from '@portal/design-system';

interface Beneficio { id: string; nome: string; valor: string; detalhe: string; status: string }
interface Reembolso { id: string; descricao: string; valor: string; situacao: string; enviadoEm: string }

function Tela({ ctx }: { ctx: JourneyContext }) {
  const [itens, setItens] = React.useState<Beneficio[] | null>(null);
  const [path, setPath] = React.useState(ctx.path);
  const [tema, setTema] = React.useState(ctx.theme);

  React.useEffect(() => ctx.onPathChange(setPath), [ctx]);
  React.useEffect(() => ctx.onThemeChange(setTema), [ctx]);

  React.useEffect(() => {
    ctx.telemetry.event('beneficios.tela_aberta');
    ctx.http.get<Beneficio[]>('/v1/beneficios').then(setItens).catch((e) => ctx.telemetry.error(e));
  }, [ctx]);

  if (!itens) return <Stack gap={3}><Skeleton h={120} /><Skeleton h={120} /></Stack>;

  const secao = path.replace(/^\//, '').replace(/\/+$/, '');

  // Rota propria da jornada, e nao um id de beneficio. Vem da busca global do
  // portal ("Solicitar reembolso") e do card de detalhe.
  if (secao === 'reembolso') return <Reembolsos ctx={ctx} />;

  const selecionado = itens.find((b) => b.id === secao);

  if (secao && !selecionado) {
    return (
      <Card>
        <EmptyState
          mark="[ ? ]"
          title="Benefício não encontrado"
          description={`Não existe um benefício com o identificador "${secao}".`}
          action={<Button onClick={() => ctx.navigate('/beneficios')}>Voltar para a lista</Button>}
        />
      </Card>
    );
  }

  if (selecionado) return <Detalhe ctx={ctx} beneficio={selecionado} tema={tema} />;

  return (
    <Stack gap={4}>
      <Row gap={3} style={{ flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => ctx.navigate('/beneficios/reembolso')}>
          Solicitar reembolso
        </Button>
      </Row>
      <div className="ds-grid">
        {itens.map((b) => (
          /*
            A acao do card e `primary` e vai no `footer`, igual a da home. Antes
            ela era `secondary` e ficava dentro do Stack -- entao esticava pela
            largura do card e parava no fim do texto. Card em grade e sempre o
            mesmo objeto, na home ou na jornada: mesma anatomia, mesma enfase.
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

function Detalhe({
  ctx, beneficio, tema
}: { ctx: JourneyContext; beneficio: Beneficio; tema: string }) {
  const [enviando, setEnviando] = React.useState(false);
  const [protocolo, setProtocolo] = React.useState<string | null>(null);

  const solicitar = async () => {
    setEnviando(true);
    try {
      // O botao chama o BFF de verdade e devolve protocolo. Um botao que so
      // dispara um toast otimista e indistinguivel de um botao quebrado no dia
      // em que o backend cai.
      const r = await ctx.http.post<{ protocolo: string }>(
        `/v1/beneficios/${beneficio.id}/solicitacoes`, { tipo: 'alteracao' }
      );
      setProtocolo(r.protocolo);
      ctx.notify(`Solicitação ${r.protocolo} enviada para análise.`, 'success');
      ctx.telemetry.event('beneficios.solicitacao_enviada', { beneficio: beneficio.id });
    } catch (e) {
      ctx.telemetry.error(e, { acao: 'solicitar', beneficio: beneficio.id });
      ctx.notify('Não foi possível enviar a solicitação agora.', 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Stack gap={4}>
      <Button variant="ghost" onClick={() => ctx.navigate('/beneficios')}>← Todos os benefícios</Button>
      <Card title={beneficio.nome} hint={beneficio.detalhe}>
        <DataList
          items={[
            { label: 'Situação', value: <Badge tone="success">{beneficio.status}</Badge> },
            { label: 'Valor ou plano', value: beneficio.valor },
            { label: 'Tema aplicado pelo shell', value: tema },
            ...(protocolo ? [{ label: 'Protocolo', value: protocolo }] : [])
          ]}
        />
        <Row gap={3} style={{ marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
          <Button onClick={solicitar} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Solicitar alteração'}
          </Button>
          <Button variant="secondary" onClick={() => ctx.navigate('/beneficios/reembolso')}>
            Pedir reembolso
          </Button>
        </Row>
      </Card>
    </Stack>
  );
}

function Reembolsos({ ctx }: { ctx: JourneyContext }) {
  const [lista, setLista] = React.useState<Reembolso[] | null>(null);
  const [descricao, setDescricao] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);

  /**
   * A flag nao esconde a tela -- ela troca o FLUXO. Com v2 desligada, o
   * colaborador cai no formulario antigo em vez de ver um botao morto. Flag que
   * apaga a saida sem oferecer alternativa e como nao ter a funcionalidade.
   */
  const v2 = ctx.flags['beneficios.reembolso-v2'] === true;

  React.useEffect(() => {
    ctx.telemetry.event('beneficios.reembolso_aberto', { versao: v2 ? 'v2' : 'v1' });
    ctx.http.get<Reembolso[]>('/v1/beneficios/reembolsos').then(setLista).catch((e) => {
      ctx.telemetry.error(e);
      setLista([]);
    });
  }, [ctx, v2]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor.trim()) {
      ctx.notify('Preencha a descrição e o valor do reembolso.', 'danger');
      return;
    }
    setEnviando(true);
    try {
      const criado = await ctx.http.post<Reembolso>('/v1/beneficios/reembolsos', { descricao, valor });
      setLista((l) => [criado, ...(l ?? [])]);
      setDescricao(''); setValor('');
      ctx.notify(`Reembolso ${criado.id} enviado para análise.`, 'success');
      ctx.telemetry.event('beneficios.reembolso_enviado', { valor });
    } catch (err) {
      ctx.telemetry.error(err, { acao: 'reembolso' });
      ctx.notify('Não foi possível enviar o reembolso agora.', 'danger');
    } finally {
      setEnviando(false);
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
        <form onSubmit={enviar}>
          <Stack gap={4}>
            <Field
              label="Descrição" placeholder="Consulta odontológica"
              value={descricao} onChange={(ev) => setDescricao(ev.target.value)}
            />
            <Field
              label="Valor" placeholder="R$ 214,90" inputMode="decimal"
              value={valor} onChange={(ev) => setValor(ev.target.value)}
            />
            <Row>
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar reembolso'}
              </Button>
            </Row>
          </Stack>
        </form>
      </Card>

      <Card title="Reembolsos recentes">
        {lista === null ? (
          <Skeleton h={80} />
        ) : lista.length === 0 ? (
          <EmptyState mark="[ - ]" title="Nenhum reembolso" description="Você ainda não pediu reembolso este ano." />
        ) : (
          <DataList
            items={lista.map((r) => ({
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
        <Tela ctx={ctx} />
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
      const atual = root;
      root = null;
      queueMicrotask(() => atual?.unmount());
    };
  }
};

export default journey;
