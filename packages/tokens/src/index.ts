/**
 * @portal/tokens — camada de ALIAS sobre o Itaú Design System.
 *
 * Traduz tokens de MARCA do IDS (`ids_color_bg_base`) em nomes de PRODUTO
 * (`c-bg-surface`). O portal não define cor nem tipografia própria.
 *
 * Decisão, ganhos e o papel do bloco `extras`: docs/adr/0005.
 */
import raw from './tokens.json';

/** semântico do portal -> nome do token no IDS */
export const alias: Record<string, string> = raw.alias;
/** valores resolvidos para React Native (RN não lê custom properties) */
export const nativeValues: Record<string, string> = raw.nativeValues;

export type ThemeName = 'light' | 'dark';
export type SemanticToken = keyof typeof raw.alias;

/** Uso em style inline: `color: token('fg-muted')`. */
export const token = (name: string) => `var(--c-${name})`;

/**
 * Degraus da escala de espacamento. Tipado de proposito: `space(9)` nao
 * compila, em vez de virar `var(--space-9)` -- uma custom property inexistente,
 * que o CSS ignora em silencio e que devolve `gap: 0` sem nenhum aviso.
 */
export type SpaceStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const space = (n: SpaceStep) => `var(--space-${n})`;
