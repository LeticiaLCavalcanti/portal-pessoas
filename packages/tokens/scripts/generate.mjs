/**
 * Gera src/tokens.css a partir de src/tokens.json.
 *
 * A saída NÃO contém valores de cor: contém `var(--ids_*)`. Ou seja, quando o
 * time do IDS publicar uma versão nova, o portal inteiro acompanha sem rebuild
 * de nenhuma jornada — os microfrontends resolvem as variáveis no runtime do
 * browser, herdadas do documento do shell.
 *
 * O CI roda este script e falha se o resultado divergir do arquivo commitado,
 * impedindo que alguém edite o CSS na mão e crie uma segunda fonte de verdade.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(here, '../src/tokens.json'), 'utf8'));

const skip = (k) => k.startsWith('_');
const line = (name, value) => `  --${name}: ${value};`;

const aliasVars = Object.entries(t.alias)
  .filter(([k]) => !skip(k))
  .map(([k, ids]) => line(`c-${k}`, `var(--${ids})`));

const staticVars = [
  ...Object.entries(t.space).map(([k, ids]) => line(`space-${k}`, `var(--${ids})`)),
  ...Object.entries(t.radius).map(([k, ids]) => line(`radius-${k}`, `var(--${ids})`)),
  ...Object.entries(t.textStyle).map(([k, ids]) => line(`ts-${k}`, `var(--${ids})`)),
  ...Object.entries(t.motion).map(([k, ids]) => line(`motion-${k}`, `var(--${ids})`)),
  ...Object.entries(t.extras).filter(([k]) => !skip(k)).map(([k, v]) => line(k, v))
];

const darkVars = Object.entries(t.darkOverrides)
  .filter(([k]) => !skip(k))
  .map(([k, v]) => line(k.startsWith('shadow') ? k : `c-${k}`, v));

const css = `/* GERADO POR scripts/generate.mjs — NÃO EDITAR A MÃO.
   Fonte: src/tokens.json (mapa) + src/ids-tokens.css (Itaú Design System). */
@import './ids-tokens.css';

:root {
${staticVars.join('\n')}
}

/* Tema claro: puro repasse do IDS. Nenhum valor de cor nasce aqui. */
:root,
[data-theme='light'] {
${aliasVars.join('\n')}
}

/* Tema escuro: aproximação enquanto o tema oficial do IDS não é consumido.
   Ver darkOverrides._doc em tokens.json. */
[data-theme='dark'] {
${darkVars.join('\n')}
}
`;

writeFileSync(join(here, '../src/tokens.css'), css);
console.log(
  `tokens.css gerado — ${aliasVars.length} aliases semânticos sobre o IDS, ` +
  `${darkVars.length} overrides de tema escuro`
);
