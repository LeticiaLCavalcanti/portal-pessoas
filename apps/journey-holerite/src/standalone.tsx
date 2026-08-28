/**
 * Fronteira assíncrona do Module Federation -- mesma razão que em
 * apps/shell/src/main.tsx: os singletons compartilhados precisam ser
 * negociados antes de qualquer módulo que importe React ser avaliado.
 *
 * O módulo exposto (`./journey`) não precisa disto: módulo exposto já é
 * carregado de forma assíncrona pelo runtime de federação, por definição.
 */
import('./standalone-app');
