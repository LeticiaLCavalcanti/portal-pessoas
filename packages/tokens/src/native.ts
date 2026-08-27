/**
 * Ponte dos tokens para React Native.
 *
 * Mesmo mapa semântico do web, valores resolvidos do IDS. Isso é o que garante
 * consistência entre WebView e telas nativas por construção — e não por acordo
 * verbal entre a squad de mobile e as squads de produto.
 *
 * Em produção, `nativeValues` seria substituído pelo pacote nativo oficial do
 * IDS; o mapa de nomes deste pacote permaneceria idêntico.
 */
import raw from './tokens.json';

const rem = (v: string) => Math.round(Number.parseFloat(v) * 16);

export const nativeTheme = (theme: 'light' | 'dark' = 'light') => ({
  color: {
    ...(raw.nativeValues as Record<string, string>),
    ...(theme === 'dark' ? (raw.darkOverrides as Record<string, string>) : {})
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 56 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, button: 12, pill: 999 },
  text: {
    display: { fontSize: 32, lineHeight: 48, fontWeight: '700' as const, fontFamily: 'Itau Display' },
    title: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, fontFamily: 'Itau Display' },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, fontFamily: 'Itau Text' },
    bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, fontFamily: 'Itau Text' },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const, fontFamily: 'Itau Text' }
  },
  _rem: rem
});
