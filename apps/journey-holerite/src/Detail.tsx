/**
 * ============================================================================
 *  Holerite / detalhe do demonstrativo  --  PRIMEIRA TELA NO DS v2
 * ============================================================================
 *
 * Este arquivo e a prova de que a migracao do Design System e gradual e por
 * ARQUIVO. Repare no que ele tem de diferente do resto da jornada:
 *
 *   - Um unico import de DS, e ele aponta para `/v2`. Nao ha dois imports, nao
 *     ha alias, nao ha `ButtonV2`. `Stack`, `Row` e `Text` ainda sao os
 *     componentes da v1 -- a superficie `/v2` os reexporta sem alteracao,
 *     entao a squad nao precisa saber de cor o que ja migrou e o que nao.
 *
 *   - `journey.tsx`, ao lado, segue 100% na v1, e `Screen` e `IncomeStatement` nao foram
 *     tocadas. As duas versoes do DS renderizam na mesma arvore React, sob o
 *     mesmo ErrorBoundary, dentro do mesmo shell -- e nenhuma das duas telas
 *     mudou de aparencia, porque as duas leem os mesmos tokens L0.
 *
 * O que a v2 resolveu aqui, concretamente:
 *
 *   1. O botao de baixar. Na v1 o estado de "gerando" era feito trocando o
 *      ROTULO na mao (`baixando ? 'Gerando…' : 'Baixar demonstrativo'`). Isso
 *      nao anuncia nada para leitor de tela -- texto que muda dentro de um
 *      botao nao e regiao viva -- e ainda mudava a largura do botao no meio do
 *      clique. `loading` resolve os dois: rotulo estavel, `aria-busy` no no
 *      certo, indicador visual.
 *
 *   2. O total liquido. Na v1 era `value={<Text size="lg">{d.liquido}</Text>}`:
 *      hierarquia montada no ponto de uso, ou seja, cada tela do portal
 *      inventava a sua. Na v2 e `emphasis: true`, e o DS decide como um total
 *      se parece.
 *
 *   3. `<dl>/<dt>/<dd>` no lugar de `<ul>/<li>`, entao o leitor de tela anuncia
 *      "Liquido a receber, R$ ..." como par, e nao duas cadeias soltas.
 *
 * Ver packages/design-system/MIGRATION.md e docs/adr/0011.
 */
import * as React from 'react';
import type { JourneyContext } from '@portal/journey-contract';
import { Badge, Button, Card, DataList, Icon, Row, Stack } from '@portal/design-system/v2';
import type { Payslip } from './types';

export function Detail({ ctx, d }: { ctx: JourneyContext; d: Payslip }) {
  const [downloading, setDownloading] = React.useState(false);

  /**
   * O "baixar" real: o BFF devolve o PDF ja assinado pelo sistema de folha, o
   * front so materializa o download. Fazer isso no cliente a partir de um
   * Blob evita expor a URL do sistema de origem e mantem o token fora da barra
   * de endereco -- o mesmo motivo pelo qual o legado recebe token por
   * postMessage e nao por querystring.
   */
  const download = async () => {
    setDownloading(true);
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
      ctx.telemetry.event('holerite.documento_baixado', { competence: d.competencia });
    } catch (e) {
      ctx.telemetry.error(e, { action: 'download', competence: d.competencia });
      ctx.notify('Não foi possível baixar o demonstrativo agora.', 'danger');
    } finally {
      setDownloading(false);
    }
  };

  const earnings = d.linhas.filter((l) => l.tipo === 'provento');
  const deductions = d.linhas.filter((l) => l.tipo === 'desconto');

  return (
    <Stack gap={4}>
      <Row>
        <Button variant="ghost" onClick={() => ctx.navigate('/holerite')}>
          ← Todos os demonstrativos
        </Button>
      </Row>

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
              // Hierarquia do total decidida pelo DS, e nao por um <Text
              // size="lg"> montado aqui. Ver o item 2 do cabecalho.
              { label: 'Líquido a receber', value: d.liquido, emphasis: true }
            ]}
          />
          <Row gap={3} style={{ flexWrap: 'wrap' }}>
            {/*
              `loading` no lugar da troca de rotulo. O `Icon` vem da v1,
              reexportado pela superficie /v2 -- primitivo v1 dentro de
              primitivo v2, no mesmo no, sem adaptador.
            */}
            <Button loading={downloading} onClick={download} iconStart={<Icon name="receipt" size={18} />}>
              Baixar demonstrativo
            </Button>
          </Row>
        </Stack>
      </Card>

      <div className="ds-grid">
        {/*
          `ds-grid` e classe da v1 e continua valendo: a v2 nao redefiniu
          utilitario de layout, entao nao ha o que migrar aqui. Major nao e
          licenca para churn -- ver patterns.tsx.
        */}
        <Card title="Proventos">
          <DataList items={earnings.map((l) => ({ label: l.descricao, value: l.valor }))} />
        </Card>
        <Card title="Descontos">
          <DataList items={deductions.map((l) => ({ label: l.descricao, value: l.valor }))} />
        </Card>
      </div>
    </Stack>
  );
}
