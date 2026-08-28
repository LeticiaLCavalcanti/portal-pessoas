/**
 * FRONTEIRA ASSÍNCRONA do Module Federation -- não importe React aqui.
 *
 * O `import()` dinâmico é o que permite ao runtime negociar qual cópia dos
 * `shared` vale para a página antes de qualquer módulo compartilhado ser
 * avaliado. Sem ele: duas cópias de React e hooks quebrados em produção.
 *
 * Ver docs/adr/0006, "Fronteira assíncrona obrigatória".
 */
import('./bootstrap');
