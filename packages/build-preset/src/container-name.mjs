/**
 * A ÚNICA tradução entre "id da jornada no registro do BFF" e "nome do
 * container de Module Federation".
 *
 * Este arquivo é importado dos DOIS lados da fronteira:
 *  - build  (`rspack.config.mjs` de cada jornada, via @portal/build-preset)
 *  - runtime (`apps/shell/src/platform/loadRemote.ts`)
 *
 * Por isso é `.mjs` puro, sem dependência de bundler nem de TypeScript: o
 * Node carrega no config, o Rspack empacota no shell. Manter os dois lados em
 * sincronia deixa de ser disciplina e passa a ser impossível de errar.
 *
 * O id do manifesto é kebab-case (`holerite-legado`); o nome do container
 * precisa ser um identificador válido de JavaScript.
 */
export const containerNameOf = (journeyId) => journeyId.replace(/-/g, '_');
