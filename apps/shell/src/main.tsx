/**
 * FRONTEIRA ASSINCRONA do Module Federation -- nao importe React aqui.
 *
 * O `import()` dinamico e o que permite ao runtime negociar qual copia dos
 * `shared` vale para a pagina antes de qualquer modulo compartilhado ser
 * avaliado. Sem ele: duas copias de React e hooks quebrados em producao.
 *
 * Ver docs/adr/0006, "Fronteira assincrona obrigatoria".
 */
import('./bootstrap');
