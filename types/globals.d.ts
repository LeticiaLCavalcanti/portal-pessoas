/**
 * Declaracoes de ambiente do monorepo.
 *
 * Antes vinham de `vite/client`. Com o Rspack, o que o projeto realmente usa e
 * so o import de CSS como efeito colateral -- entao declaramos exatamente isso,
 * em vez de puxar os tipos inteiros de um bundler.
 */
declare module '*.css';
