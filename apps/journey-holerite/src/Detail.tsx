/**
 * ============================================================================
 *  Holerite / detalhe do demonstrativo  --  PRIMEIRA TELA NO DS v2
 * ============================================================================
 *
 * Este arquivo é a prova de que a migração do Design System é gradual e por
 * ARQUIVO. Repare no que ele tem de diferente do resto da jornada:
 *
 *   - Um único import de DS, e ele aponta para `/v2`. Não há dois imports, não
 *     há alias, não há `ButtonV2`. `Stack`, `Row` e `Text` ainda são os
 *     componentes da v1 -- a superfície `/v2` os reexporta sem alteração,
 *     então a squad não precisa saber de cor o que já migrou é o que não.
 *
 *   - `journey.tsx`, ao lado, segue 100% na v1, e `Screen` e `IncomeStatement` não foram
 *     tocadas. As duas versões do DS renderizam na mesma árvore React, sob o
 *     mesmo ErrorBoundary, dentro do mesmo shell -- e nenhuma das duas telas
 *     mudou de aparência, porque as duas leem os mesmos tokens L0.
 *
 * O que a v2 resolveu aqui, concretamente:
 *
 *   1. O botão de baixar. Na v1 o estado de "gerando" era feito trocando o
 *      RÓTULO na mão (`baixando ? 'Gerando…' : 'Baixar demonstrativo'`). Isso
 *      não anuncia nada para leitor de tela -- texto que muda dentro de um
 *      botão não é região viva -- e ainda mudava a largura do botão no meio do
 *      clique. `loading` resolve os dois: rótulo estável, `aria-busy` no no
 *      certo, indicador visual.
 *
 *   2. O total líquido. Na v1 era `value={<Text size="lg">{d.liquido}</Text>}`:
 *      hierarquia montada no ponto de uso, ou seja, cada tela do portal
 *      inventava a sua. Na v2 é `emphasis: true`, e o DS decide como um total
 *      se parece.
 *
 *   3. `<dl>/<dt>/<dd>` no lugar de `<ul>/<li>`, então o leitor de tela anuncia
 *      "Líquido a receber, R$ ..." como par, e não duas cadeias soltas.
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
   * O "baixar" real: o BFF devolve o PDF já assinado pelo sistema de folha, o
   * front só materializa o download. Fazer isso no cliente a partir de um
   * Blob evita expor a URL do sistema de origem e mantém o token fora da barra
   * de endereço -- o mesmo motivo pelo qual o legado recebe token por
   * postMessage e não por querystring.
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
              // Hierarquia do total decidida pelo DS, e não por um <Text
              // size="lg"> montado aqui. Ver o item 2 do cabeçalho.
              { label: 'Líquido a receber', value: d.liquido, emphasis: true }
            ]}
          />
          <Row gap={3} style={{ flexWrap: 'wrap' }}>
            {/*
              `loading` no lugar da troca de rótulo. O `Icon` vem da v1,
              reexportado pela superfície /v2 -- primitivo v1 dentro de
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
          `ds-grid` é classe da v1 e continua valendo: a v2 não redefiniu
          utilitário de layout, então não há o que migrar aqui. Major não é
          licença para churn -- ver patterns.tsx.
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
