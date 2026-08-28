/**
 * Declarações de ambiente do monorepo.
 *
 * Antes vinham de `vite/client`. Com o Rspack, o que o projeto realmente usa é
 * só o import de CSS como efeito colateral -- então declaramos exatamente isso,
 * em vez de puxar os tipos inteiros de um bundler.
 */
declare module '*.css';
declare module '*.png' {
	const source: string;
	export default source;
}

/**
 * `process.env.NODE_ENV` -- o único pedaço de `process` que o código de browser
 * do portal toca.
 *
 * Não instalamos `@types/node` por isto: seriam centenas de globais de servidor
 * (`Buffer`, `__dirname`, `setImmediate`) disponíveis por autocomplete em
 * arquivo que roda no browser, e o primeiro uso acidental só apareceria em
 * runtime. Declarar a superfície exata mantém o erro em tempo de compilação.
 *
 * O bundler substitui o literal em build de produção, então os blocos guardados
 * por ele (avisos de depreciação do DS v2, por exemplo) viram código morto e
 * somem no minificador.
 */
declare const process: { env: { NODE_ENV?: string } };
