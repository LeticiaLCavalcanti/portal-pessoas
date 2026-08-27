/**
 * ============================================================================
 *  Jornada: Holerite  |  dona: squad-remuneracao
 * ============================================================================
 *
 * Terceira jornada moderna do portal, e a prova mais direta do requisito
 * "incluir jornada nova sem alterar o core": para ela existir, NENHUM arquivo
 * de `apps/shell` foi tocado. O que mudou foi uma linha em
 * `apps/bff/src/registry.json` -- que em producao e um PR no repositorio da
 * propria squad, sem revisor do time de plataforma.
 *
 * Ela tambem carrega o `fallbackJourneyId` no manifesto: se este bundle cair,
 * o colaborador nao fica sem holerite -- o shell oferece a versao legada, que
 * continua no ar durante a migracao.
 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { JourneyContext, JourneyModule } from '@portal/journey-contract';
import {
  Badge, Button, Card, DataList, EmptyState, ErrorBoundary, Row, Skeleton, Stack, Text
} from '@portal/design-system';

interface Demonstrativo {
  competencia: string;
  referencia: string;
  bruto: string;
  descontos: string;
  liquido: string;
  situacao: string;
  tipo: 'mensal' | 'decimo-terceiro';
  linhas: { descricao: string; tipo: 'provento' | 'desconto'; valor: string }[];
}

interface Holerite {
  demonstrativos: Demonstrativo[];
  informeRendimentos: { ano: string; situacao: string }[];
}

function Tela({ ctx }: { ctx: JourneyContext }) {
  const [dados, setDados] = React.useState<Holerite | null>(null);
  const [path, setPath] = React.useState(ctx.path);

  React.useEffect(() => ctx.onPathChange(setPath), [ctx]);

  React.useEffect(() => {
    ctx.telemetry.event('holerite.tela_aberta');
    ctx.http.get<Holerite>('/v1/holerite').then(setDados).catch((e) => ctx.telemetry.error(e));
  }, [ctx]);

  if (!dados) return <Stack gap={3}><Skeleton h={110} /><Skeleton h={140} /></Stack>;

  const secao = path.replace(/^\//, '').replace(/\/+$/, '');

  if (secao === 'informe') return <Informe ctx={ctx} anos={dados.informeRendimentos} />;

  if (secao) {
    const d = dados.demonstrativos.find((x) => x.competencia === secao);
    if (!d) {
      return (
        <Card>
          <EmptyState
            mark="[ ? ]"
            title="Demonstrativo não encontrado"
            description={`Não há demonstrativo para a competência "${secao}".`}
            action={<Button onClick={() => ctx.navigate('/holerite')}>Voltar para a lista</Button>}
          />
        </Card>
      );
    }
    return <Detalhe ctx={ctx} d={d} />;
  }

  return (
    <Stack gap={4}>
      <Row gap={3} style={{ flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => ctx.navigate('/holerite/informe')}>
          Informe de rendimentos
        </Button>
      </Row>

      <div className="ds-grid">
        {dados.demonstrativos.map((d) => (
          <Card
            key={d.competencia}
            title={d.referencia}
            hint={d.tipo === 'decimo-terceiro' ? 'Décimo terceiro salário' : 'Folha mensal'}
            actions={<Badge tone={d.situacao === 'pago' ? 'success' : 'accent'}>{d.situacao}</Badge>}
            footer={
              <Button onClick={() => {
                ctx.telemetry.event('holerite.detalhe_aberto', { competencia: d.competencia });
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

function Detalhe({ ctx, d }: { ctx: JourneyContext; d: Demonstrativo }) {
  const [baixando, setBaixando] = React.useState(false);

  /**
   * O "baixar" real: o BFF devolve o PDF ja assinado pelo sistema de folha, o
   * front so materializa o download. Fazer isso no cliente a partir de um
   * Blob evita expor a URL do sistema de origem e mantem o token fora da barra
   * de endereco -- o mesmo motivo pelo qual o legado recebe token por
   * postMessage e nao por querystring.
   */
  const baixar = async () => {
    setBaixando(true);
    try {
      const r = await ctx.http.get<{ nomeArquivo: string; conteudoBase64: string; mimeType: string }>(
        `/v1/holerite/${d.competencia}/documento`
      );
      const bytes = Uint8Array.from(atob(r.conteudoBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: r.mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = r.nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
      ctx.notify(`Demonstrativo de ${d.referencia} baixado.`, 'success');
      ctx.telemetry.event('holerite.documento_baixado', { competencia: d.competencia });
    } catch (e) {
      ctx.telemetry.error(e, { acao: 'baixar', competencia: d.competencia });
      ctx.notify('Não foi possível baixar o demonstrativo agora.', 'danger');
    } finally {
      setBaixando(false);
    }
  };

  const proventos = d.linhas.filter((l) => l.tipo === 'provento');
  const descontos = d.linhas.filter((l) => l.tipo === 'desconto');

  return (
    <Stack gap={4}>
      <Button variant="ghost" onClick={() => ctx.navigate('/holerite')}>← Todos os demonstrativos</Button>

      <Card
        title={d.referencia}
        hint={`Competência ${d.competencia}`}
        actions={<Badge tone={d.situacao === 'pago' ? 'success' : 'accent'}>{d.situacao}</Badge>}
      >
        <Stack gap={5}>
          <DataList
            items={[
              { label: 'Total de proventos', value: d.bruto },
              { label: 'Total de descontos', value: d.descontos },
              { label: 'Líquido a receber', value: <Text size="lg">{d.liquido}</Text> }
            ]}
          />
          <Row gap={3} style={{ flexWrap: 'wrap' }}>
            <Button onClick={baixar} disabled={baixando}>
              {baixando ? 'Gerando…' : 'Baixar demonstrativo'}
            </Button>
          </Row>
        </Stack>
      </Card>

      <div className="ds-grid">
        <Card title="Proventos">
          <DataList items={proventos.map((l) => ({ label: l.descricao, value: l.valor }))} />
        </Card>
        <Card title="Descontos">
          <DataList items={descontos.map((l) => ({ label: l.descricao, value: l.valor }))} />
        </Card>
      </div>
    </Stack>
  );
}

function Informe({ ctx, anos }: { ctx: JourneyContext; anos: { ano: string; situacao: string }[] }) {
  return (
    <Stack gap={4}>
      <Button variant="ghost" onClick={() => ctx.navigate('/holerite')}>← Todos os demonstrativos</Button>
      <Card title="Informe de rendimentos" hint="Documento anual para a declaração de imposto de renda.">
        <DataList
          items={anos.map((a) => ({
            label: `Ano-calendário ${a.ano}`,
            value: (
              <Row gap={2} style={{ alignItems: 'center' }}>
                <Badge tone={a.situacao === 'disponível' ? 'success' : 'warn'}>{a.situacao}</Badge>
                {a.situacao === 'disponível' && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      ctx.telemetry.event('holerite.informe_solicitado', { ano: a.ano });
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
