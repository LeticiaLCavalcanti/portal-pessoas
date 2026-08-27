/**
 * ============================================================================
 *  CAMADA 2 do DS: assinatura de marca
 * ============================================================================
 *
 * O lockup mora no DS, não no shell — docs/adr/0005.
 *
 * O PNG abaixo é um ativo substituto; o logotipo oficial é proprietário e não
 * acompanha o repositório. Trocar o <img> basta: as medidas vêm de tokens.
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
