/**
 * Fronteira assincrona do Module Federation -- mesma razao que em
 * apps/shell/src/main.tsx: os singletons compartilhados precisam ser
 * negociados antes de qualquer modulo que importe React ser avaliado.
 *
 * O modulo exposto (`./journey`) nao precisa disto: modulo exposto ja e
 * carregado de forma assincrona pelo runtime de federacao, por definicao.
 */
import('./standalone-app');
