/**
 * CAMADA 1 do DS: primitivos.
 * Sem nenhuma nocao de negocio. Se um componente daqui precisar saber o que e
 * "holerite", ele esta na camada errada.
 */
import * as React from 'react';
import { space, type SpaceStep } from '@portal/tokens';

export { Icon, iconNames, type IconName } from './Icon';

type Div = React.HTMLAttributes<HTMLDivElement>;

/**
 * O espacamento vem de `space()` do @portal/tokens, e nao de um template
 * string montado aqui.
 *
 * Nao e preciosismo: durante meses estes dois componentes emitiram
 * `gap: var(--pp-space-4)`, com um prefixo `--pp-` que nunca existiu no pacote
 * de tokens. Custom property indefinida nao gera erro, nao aparece no console
 * e nao quebra o build -- a declaracao simplesmente vira invalida em tempo de
 * computo e o `gap` volta para `normal`, ou seja, ZERO. Todo Stack e todo Row
 * do portal ficaram sem espacamento, em silencio.
 *
 * Com a funcao do pacote de tokens, o nome da variavel deixa de ser digitado a
 * mao e passa a ser importado: um erro de prefixo vira erro de compilacao.
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
 * Isolamento de falha de render. Vive no DS porque TODA arvore React do portal
 * precisa dele -- a do shell e a de cada jornada. Ver docs/adr/0007.
 *
 * `resetKey`: mudou a chave (outra jornada, outra tentativa), o boundary volta
 * a tentar renderizar. Sem isto, "tentar de novo" nao tem efeito nenhum.
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
    // Sem `fallback`, o boundary nao desenha nada: quem manda na tela de erro e
    // o shell, avisado por `ctx.fail`. Duas telas de erro empilhadas e pior
    // do que uma.
    return this.props.fallback?.(() => this.setState({ error: null }), this.state.error) ?? null;
  }
}
