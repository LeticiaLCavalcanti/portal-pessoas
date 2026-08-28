/**
 * ============================================================================
 *  DS v2 — CAMADA 2: composições
 * ============================================================================
 *
 * Regra que governa esta camada na v2: **major não é licença para churn.**
 * Só quebra o que tem motivo. `Card` mantém exatamente os nomes de prop da v1
 * porque não havia nada errado com eles -- ele existe aqui apenas para carregar
 * o namespace `ds2-` e a camada de tokens de componente. Trocar o import de um
 * Card é uma linha, e nenhuma prop muda junto.
 *
 * `DataList` quebra, e por um motivo estrutural: par rótulo/valor é uma LISTA
 * DE DEFINIÇÃO, não uma lista não-ordenada. Ver o comentário sobre `<dl>` mais
 * abaixo -- ele resolve por construção o bug de aninhamento que a v1 precisou
 * remediar com `as="div"`.
 */
import * as React from 'react';

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  hint?: string;
  /** Canto superior direito. Selo de estado, normalmente. */
  actions?: React.ReactNode;
  /** Ação ancorada na BASE, para a fileira de cards sair alinhada numa grade. */
  footer?: React.ReactNode;
  /**
   * `flat` remove sombra e borda: para card DENTRO de card, onde a moldura
   * dupla vira ruído. Novo na v2 -- na v1 a saída era `className` com override.
   */
  elevation?: 'raised' | 'flat';
  /** `compact` reduz o padding para grades densas. Novo na v2. */
  density?: 'comfortable' | 'compact';
  /** `section` por padrão; `article` quando o card é conteúdo autocontido. */
  as?: 'section' | 'article' | 'div';
}

export function Card({
  title,
  hint,
  actions,
  footer,
  elevation = 'raised',
  density = 'comfortable',
  as: As = 'section',
  className = '',
  children,
  ...rest
}: CardProps) {
  const cls = ['ds2-card', `ds2-card--${elevation}`, `ds2-card--${density}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <As className={cls} {...rest}>
      {(title || actions) && (
        <header className="ds2-card__head">
          <div className="ds2-card__heading">
            {title && <h2 className="ds2-card__title">{title}</h2>}
            {hint && <p className="ds2-card__hint">{hint}</p>}
          </div>
          {actions && <div className="ds2-card__actions">{actions}</div>}
        </header>
      )}
      {children}
      {footer && <div className="ds2-card__footer">{footer}</div>}
    </As>
  );
}

/* -------------------------------------------------------------------------- */
/* DataList                                                                    */
/* -------------------------------------------------------------------------- */

export interface DataListItem {
  label: string;
  value: React.ReactNode;
  /** Linha de destaque (total, saldo). Reforça o valor, não o rótulo. */
  emphasis?: boolean;
  /** Texto auxiliar sob o rótulo. Ex.: a base de cálculo de um desconto. */
  hint?: string;
}

export function DataList({
  items,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDListElement> & { items: readonly DataListItem[] }) {
  return (
    /**
     * `<dl>`, e não `<ul>` como na v1.
     *
     * Ganho de acessibilidade: o leitor de tela anuncia o par ("Líquido a
     * receber, R$ 8.412,90") em vez de ler duas cadeias soltas dentro do mesmo
     * item de lista, sem dizer qual é rótulo e qual é valor.
     *
     * Ganho estrutural, é o que de fato motivou a quebra: `<dd>` é container de
     * conteúdo de fluxo, então `value` pode ser um Badge, um botão ou uma Row
     * sem que o navegador reorganize a árvore. A v1 emitia `<p>` para o valor,
     * o parser FECHAVA o parágrafo ao encontrar um `<div>` dentro, e o React
     * reclamava de validateDOMNesting -- o remédio de lá (`as="div"`) some aqui
     * porque o problema deixa de existir.
     *
     * O `<div>` envolvendo cada par é permitido dentro de `<dl>` pela
     * especificação HTML, e é o que permite estilizar a linha como uma unidade.
     */
    <dl className={`ds2-datalist ${className}`.trim()} {...rest}>
      {items.map((it) => (
        <div
          key={it.label}
          className={`ds2-datalist__row ${it.emphasis ? 'is-emphasis' : ''}`.trim()}
        >
          <dt className="ds2-datalist__label">
            {it.label}
            {it.hint && <span className="ds2-datalist__hint">{it.hint}</span>}
          </dt>
          <dd className="ds2-datalist__value">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
