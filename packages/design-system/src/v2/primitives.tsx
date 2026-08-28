/**
 * ============================================================================
 *  DS v2 — CAMADA 1: primitivos
 * ============================================================================
 *
 * O que muda em relação à v1, e por quê (detalhe em ../MIGRATION.md):
 *
 *  - `Button` separa ÊNFASE (`variant`) de INTENÇÃO (`tone`). Na v1 as duas
 *    moravam na mesma prop, então "botão de ação destrutiva" era impossível de
 *    expressar: `variant="danger"` não existia, e criar essa quarta variante
 *    duplicaria as três já existentes vezes cada intenção nova.
 *  - `Button` ganha `loading`. A jornada de holerite trocava o RÓTULO na mão
 *    ("Baixar demonstrativo" -> "Gerando…") e só desabilitava o botão: o leitor
 *    de tela não era avisado de nada, porque texto que muda dentro de um botão
 *    não é região viva. `aria-busy` no lugar certo resolve para todo mundo.
 *  - `Badge` renomeia os tons para o vocabulário semântico do IDS
 *    (`warn` -> `warning`, `danger` -> `critical`) e passa a exigir `tone`
 *    explícito. `undefined` significando "cinza" era um default invisível.
 *
 * O que NÃO muda: a aparência. Os dois pacotes leem os mesmos tokens L0, então
 * um Badge v1 e um Badge v2 lado a lado na mesma tela são indistinguíveis.
 * Isso é requisito, não coincidência -- é o que permite migrar uma TELA por vez
 * sem que o portal fique com duas caras durante a transição.
 */
import * as React from 'react';
import { warnDeprecated } from './deprecations';

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonTone = 'accent' | 'neutral' | 'critical';

/** Valores da v1 que a v2 ainda aceita. Removidos na v3. */
type ButtonVariantV1 = 'primary' | 'secondary';

const V1_VARIANT: Record<ButtonVariantV1, { variant: ButtonVariant; tone: ButtonTone }> = {
  primary: { variant: 'solid', tone: 'accent' },
  secondary: { variant: 'outline', tone: 'accent' }
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Ênfase visual. `'primary' | 'secondary'` são aceitos como ponte da v1 e
   * traduzidos para `solid`/`outline` + `tone="accent"`.
   */
  variant?: ButtonVariant | ButtonVariantV1;
  /** Intenção. Independe da ênfase: existe `ghost` crítico e `solid` neutro. */
  tone?: ButtonTone;
  size?: 'sm' | 'md';
  /**
   * Desabilita e anuncia `aria-busy`, preservando o rótulo. Quem quiser trocar
   * o texto ainda pode -- mas não precisa mais trocar para ficar acessível.
   */
  loading?: boolean;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'solid',
  tone,
  size = 'md',
  loading = false,
  iconStart,
  iconEnd,
  fullWidth,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  let emphasis: ButtonVariant;
  let intent: ButtonTone;

  if (variant === 'primary' || variant === 'secondary') {
    const translated = V1_VARIANT[variant];
    emphasis = translated.variant;
    // `tone` explícito vence a tradução: quem já migrou metade da prop não
    // deve ser puxado de volta para o accent.
    intent = tone ?? translated.tone;
    warnDeprecated(
      `button.variant.${variant}`,
      `<Button variant="${variant}"> é da v1. Use variant="${translated.variant}" tone="${translated.tone}". ` +
        'A ponte sai na v3 — ver packages/design-system/MIGRATION.md.'
    );
  } else {
    emphasis = variant;
    // Ghost sem tom é secundário por definição (voltar, cancelar): na v1 ele
    // usava --c-fg-muted, e mudar isso agora repintaria toda tela migrada.
    intent = tone ?? (variant === 'ghost' ? 'neutral' : 'accent');
  }

  const cls = [
    'ds2-btn',
    `ds2-btn--${emphasis}`,
    `ds2-btn--tone-${intent}`,
    `ds2-btn--${size}`,
    fullWidth && 'ds2-btn--block',
    loading && 'is-loading',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* O spinner é decorativo: quem anuncia o estado é o aria-busy acima. */}
      {loading && <span className="ds2-btn__spinner" aria-hidden />}
      {iconStart}
      <span className="ds2-btn__label">{children}</span>
      {iconEnd}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'critical';

/** Tons da v1 que a v2 ainda aceita. Removidos na v3. */
type BadgeToneV1 = 'warn' | 'danger';

const V1_TONE: Record<BadgeToneV1, BadgeTone> = {
  warn: 'warning',
  danger: 'critical'
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone | BadgeToneV1;
  children: React.ReactNode;
}

/**
 * Não existe `variant="solid"` aqui, e a ausência é deliberada.
 *
 * Selo preenchido exige, por tom e por tema, um par (fundo forte, texto legível
 * sobre ele). O recorte de alias do portal só expõe o par SOFT: `--c-warn-text`
 * é `ids_color_feedback_alert_contrast`, ou seja `#000000` -- a cor do TEXTO
 * SOBRE o alerta, não a cor do alerta. Usá-lo como fundo desenharia um selo de
 * aviso preto. No tema escuro `--c-info-text` continua azul-escuro contra um
 * `--c-fg-inverse` também escuro, e o selo fica ilegível.
 *
 * Fechar essa lacuna significaria escolher cores aqui, que é exatamente o que a
 * ADR 0005 proíbe. O caminho certo é RFC ao time do IDS pedindo o par forte dos
 * tokens de feedback; até lá a v2 não oferece a variante. Ver MIGRATION.md.
 */
export function Badge({ tone, className = '', children, ...rest }: BadgeProps) {
  let intent: BadgeTone;

  if (tone === 'warn' || tone === 'danger') {
    intent = V1_TONE[tone];
    warnDeprecated(
      `badge.tone.${tone}`,
      `<Badge tone="${tone}"> é da v1. Use tone="${V1_TONE[tone]}". ` +
        'A ponte sai na v3 — ver packages/design-system/MIGRATION.md.'
    );
  } else if (tone === undefined) {
    // Na v1, ausência de tom desenhava um selo cinza. Continua desenhando --
    // o que muda é que agora existe um nome para isso.
    intent = 'neutral';
  } else {
    intent = tone;
  }

  return (
    <span className={`ds2-badge ds2-badge--${intent} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
