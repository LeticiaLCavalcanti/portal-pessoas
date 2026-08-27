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
      <svg
        className="ds-brand__symbol"
        viewBox="0 0 32 32"
        width="26"
        height="26"
        aria-hidden
        focusable="false"
      >
        {/* Quadrado de contencao da marca, no laranja Itau. `rx` proporcional
            ao lado, para o raio nao se deformar quando o simbolo muda de
            tamanho. Sem glifo dentro: a marca do Itau E o logotipo "Itau" ao
            lado -- repetir uma inicial dentro do quadrado seria dizer a mesma
            coisa duas vezes, e nao corresponde ao ativo oficial. */}
        <rect x="0" y="0" width="32" height="32" rx="8" className="ds-brand__square" />
      </svg>

      <span className="ds-brand__word">Itaú</span>
      <span className="ds-brand__rule" aria-hidden />
      <span className="ds-brand__product">{product}</span>
    </>
  );

  // Sem `onClick` a marca e so identidade visual -- e nao deve virar um botao
  // que nao faz nada, que e o jeito mais barato de o portal parecer quebrado.
  return onClick ? (
    <button type="button" className="ds-brand" onClick={onClick} aria-label={`${product}, ir para o início`}>
      {conteudo}
    </button>
  ) : (
    <span className="ds-brand">{conteudo}</span>
  );
}
