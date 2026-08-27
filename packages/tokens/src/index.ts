/**
 * @portal/tokens — camada de ALIAS sobre o Itaú Design System.
 *
 * Decisão de arquitetura: o portal NÃO tem um design system próprio de cores e
 * tipografia. O Itaú já tem o IDS, e reconstruí-lo seria criar uma segunda
 * fonte de verdade de marca — o erro clássico de portal interno.
 *
 * O que este pacote faz é traduzir os tokens de MARCA do IDS
 * (`ids_color_bg_base`) em nomes de PRODUTO (`c-bg-surface`). Três ganhos:
 *   1. Os componentes do portal ficam legíveis para quem não decorou o IDS.
 *   2. Uma major do IDS é absorvida mudando um mapa, não 200 arquivos.
 *   3. Fica explícito, em `extras`, o que o portal precisou e o IDS não cobre —
 *      cada item ali é candidato a RFC para o time de Design System.
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
