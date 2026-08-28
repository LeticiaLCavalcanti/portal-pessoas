/**
 * CAMADA 1 do DS: primitivos.
 * Sem nenhuma noção de negócio. Se um componente daqui precisar saber o que é
 * "holerite", ele está na camada errada.
 */
import * as React from 'react';
import { space, type SpaceStep } from '@portal/tokens';

export { Icon, iconNames, type IconName } from './Icon';

type Div = React.HTMLAttributes<HTMLDivElement>;

/**
 * O espaçamento vem de `space()` do @portal/tokens, e não de um template
 * string montado aqui.
 *
 * Não é preciosismo: durante meses estes dois componentes emitiram
 * `gap: var(--pp-space-4)`, com um prefixo `--pp-` que nunca existiu no pacote
 * de tokens. Custom property indefinida não gera erro, não aparece no console
 * e não quebra o build -- a declaração simplesmente vira inválida em tempo de
 * cômputo e o `gap` volta para `normal`, ou seja, ZERO. Todo Stack e todo Row
 * do portal ficaram sem espaçamento, em silêncio.
 *
 * Com a função do pacote de tokens, o nome da variável deixa de ser digitado a
 * mão e passa a ser importado: um erro de prefixo vira erro de compilação.
 */
export const Stack = ({ gap = 4, ...p }: Div & { gap?: SpaceStep }) => (
  <div {...p} className={`ds-stack ${p.className ?? ''}`} style={{ gap: space(gap), ...p.style }} />
);

export const Row = ({ gap = 3, ...p }: Div & { gap?: SpaceStep }) => (
  <div {...p} className={`ds-row ${p.className ?? ''}`} style={{ gap: space(gap), ...p.style }} />
);

export function Text({
  as: As = 'p', size = 'md', tone, mono, className = '', ...rest
}: React.HTMLAttributes<HTMLElement> & {
  as?: any; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  tone?: 'muted' | 'subtle'; mono?: boolean;
}) {
  const cls = ['ds-text', `ds-text--${size}`, tone && `ds-text--${tone}`, mono && 'ds-text--mono', className]
    .filter(Boolean).join(' ');
  return <As className={cls} {...rest} />;
}

export function Button({
  variant = 'primary', className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button type="button" className={`ds-btn ds-btn--${variant} ${className}`} {...rest} />;
}

export function Badge({
  tone, children
}: { tone?: 'accent' | 'warn' | 'danger' | 'success'; children: React.ReactNode }) {
  return <span className={`ds-badge ${tone ? `ds-badge--${tone}` : ''}`}>{children}</span>;
}

export const Skeleton = ({ h = 16, w = '100%' }: { h?: number; w?: number | string }) => (
  <div className="ds-skeleton" style={{ height: h, width: w }} aria-hidden />
);

export function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = React.useId();
  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={id}>{label}</label>
      <input id={id} className="ds-input" {...rest} />
    </div>
  );
}

/**
 * Isolamento de falha de render. Vive no DS porque TODA árvore React do portal
 * precisa dele -- a do shell e a de cada jornada. Ver docs/adr/0007.
 *
 * `resetKey`: mudou a chave (outra jornada, outra tentativa), o boundary volta
 * a tentar renderizar. Sem isto, "tentar de novo" não tem efeito nenhum.
 */
export class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: (retry: () => void, error: unknown) => React.ReactNode;
    onError?: (error: unknown) => void;
    resetKey?: unknown;
  },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prev: { resetKey?: unknown }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Sem `fallback`, o boundary não desenha nada: quem manda na tela de erro é
    // o shell, avisado por `ctx.fail`. Duas telas de erro empilhadas é pior
    // do que uma.
    return this.props.fallback?.(() => this.setState({ error: null }), this.state.error) ?? null;
  }
}
