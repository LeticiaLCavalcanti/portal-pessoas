/**
 * ============================================================================
 *  CAMADA 2 do DS: assinatura de marca
 * ============================================================================
 *
 * O lockup de marca mora no DS, e nao no shell, pelo mesmo motivo que os
 * tokens: e a peca que precisa ser IDENTICA em todo produto interno. Se cada
 * portal desenhar o proprio cabecalho, em dois anos a empresa tem cinco
 * versoes da marca com espacamentos diferentes -- o erro classico que a
 * ADR 0005 tenta evitar.
 *
 * ---------------------------------------------------------------------------
 * SOBRE O ATIVO OFICIAL -- leia antes de achar que esta pronto
 *
 * O simbolo abaixo e desenhado com os tokens de marca do IDS
 * (`--ids_color_bg_brand_secondary`, o laranja Itau) na geometria correta do
 * quadrado de contencao. Ele NAO e o arquivo oficial da marca: o SVG do
 * logotipo Itau e ativo proprietario e nao acompanha este repositorio, pela
 * mesma razao que as fontes "Itau Display" e "Itau Text" nao acompanham.
 *
 * Dentro da rede, a substituicao e de uma linha: troque o <svg> por
 *   <img src={...} alt="Itau" />  apontando para o ativo do pipeline do IDS,
 * ou importe o componente oficial. As medidas ao redor vem de tokens, entao o
 * lockup nao se desloca quando o ativo real entra.
 *
 * A palavra "Itau" e renderizada com a familia tipografica do IDS: dentro da
 * rede ela aparece na face oficial da marca; fora dela, no fallback de
 * sistema, com as mesmas metricas.
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';
import logoItau from '../assets/logo_itau_varejo_92x92.png';

export function Brand({
  product,
  onClick
}: {
  /** Nome do produto ao lado da marca. Ex.: "Portal Pessoas". */
  product: string;
  onClick?: () => void;
}) {
  const conteudo = (
    <>
      <img
        className="ds-brand__symbol"
        width="36"
        height="36"
        src={logoItau}
        alt="Itaú"
      />

      <span className="ds-brand__rule" aria-hidden />
      <span className="ds-brand__product">{product}</span>
    </>
  );

  return onClick ? (
    <button type="button" className="ds-brand" onClick={onClick} aria-label={`${product}, ir para o início`}>
      {conteudo}
    </button>
  ) : (
    <span className="ds-brand">{conteudo}</span>
  );
}
