/**
 * CAMADA 2 do DS: composições.
 * Ainda agnósticas de domínio, mas já opinativas sobre layout e hierarquia.
 * É aqui que garantimos que "card de jornada" da squad A e da squad B são iguais.
 */
import * as React from 'react';
import { Text, Row } from '../primitives';

export { Brand } from './Brand';
export { Tabs, type TabItem } from './Tabs';

export function Card({
  title, hint, actions, footer, children, ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  hint?: string;
  /** Conteúdo do canto superior direito. Selo de estado, normalmente. */
  actions?: React.ReactNode;
  /**
   * Ação do card, ancorada na BASE. Numa grade os cards têm alturas de texto
   * diferentes; com o botão no fim do conteúdo, a fileira sai desalinhada.
   */
  footer?: React.ReactNode;
}) {
  return (
    <section {...rest} className={`ds-card ${rest.className ?? ''}`}>
      {(title || actions) && (
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {title && <h2 className="ds-card__title">{title}</h2>}
            {hint && <p className="ds-card__hint">{hint}</p>}
          </div>
          {actions}
        </Row>
      )}
      {children}
      {footer && <div className="ds-card__footer">{footer}</div>}
    </section>
  );
}

export function EmptyState({
  mark = '( )', title, description, action
}: {
  /**
   * Marca acima do título. `ReactNode` é não `string` porque estado de falha
   * pede ícone e estado vazio pede a marca tipográfica (`[ - ]`, `[ ? ]`) --
   * restringir a string obrigaria o ponto de uso a desenhar o SVG na mão.
   * Aditivo: todo `mark="[ x ]"` que já existia continua valendo.
   */
  mark?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ds-empty">
      <div className="ds-empty__mark">{mark}</div>
      <Text size="lg" style={{ marginTop: 'var(--space-3)' }}>{title}</Text>
      {description && <Text tone="muted" size="sm" style={{ marginTop: 'var(--space-1)' }}>{description}</Text>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}

export function DataList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <ul className="ds-list">
      {items.map((it) => (
        <li className="ds-list__item" key={it.label}>
          <Text size="sm" tone="muted" as="span">{it.label}</Text>
          {/*
            `as="div"` é obrigatório aqui, e não preferência de estilo: `value`
            é ReactNode, então a squad legitimamente passa um Badge, um botão ou
            uma Row. Com o <p> que estava aqui, o navegador FECHAVA o parágrafo
            ao encontrar o <div> e reordenava a árvore -- o React reclamava de
            validateDOMNesting e, em casos com hidratação, o nó ficava fora de
            lugar. Um primitivo do DS não pode restringir o que ele mesmo
            aceita como ReactNode.
          */}
          <Text size="sm" as="div">{it.value}</Text>
        </li>
      ))}
    </ul>
  );
}
