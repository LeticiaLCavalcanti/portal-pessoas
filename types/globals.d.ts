/**
 * Declaracoes de ambiente do monorepo.
 *
 * Antes vinham de `vite/client`. Com o Rspack, o que o projeto realmente usa e
 * so o import de CSS como efeito colateral -- entao declaramos exatamente isso,
 * em vez de puxar os tipos inteiros de um bundler.
 */
declare module '*.css';
declare module '*.png' {
	const source: string;
	export default source;
}

/**
 * `process.env.NODE_ENV` -- o unico pedaco de `process` que o codigo de browser
 * do portal toca.
 *
 * Nao instalamos `@types/node` por isto: seriam centenas de globais de servidor
 * (`Buffer`, `__dirname`, `setImmediate`) disponiveis por autocomplete em
 * arquivo que roda no browser, e o primeiro uso acidental so apareceria em
 * runtime. Declarar a superficie exata mantem o erro em tempo de compilacao.
 *
 * O bundler substitui o literal em build de producao, entao os blocos guardados
 * por ele (avisos de depreciacao do DS v2, por exemplo) viram codigo morto e
 * somem no minificador.
 */
declare const process: { env: { NODE_ENV?: string } };
