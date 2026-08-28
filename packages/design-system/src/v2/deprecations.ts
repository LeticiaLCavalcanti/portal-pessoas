/**
 * ============================================================================
 *  DS v2 — aviso de API depreciada
 * ============================================================================
 *
 * A v2 ACEITA os valores de prop da v1 e os traduz. Sem isso, "migrar" seria um
 * find/replace atômico em N arquivos de M squads no mesmo PR -- exatamente o
 * que a ADR 0011 se propõe a evitar.
 *
 * O aviso existe para que o débito seja CONTÁVEL: sem ele, a ponte de
 * compatibilidade vira permanente e a v3 nasce carregando a v1 nas costas.
 *
 * Três cuidados deliberados:
 *
 *  1. `process.env.NODE_ENV` e não uma flag nossa. O bundler substitui o
 *     literal em build de produção, então o corpo inteiro da função vira código
 *     morto e some no minificador. O colaborador não paga bytes pelo nosso
 *     débito.
 *
 *  2. Uma vez por chave, não por render. Um Badge depreciado dentro de uma
 *     lista de 200 linhas emitiria 200 avisos por render e o console viraria
 *     inútil -- que é o mesmo que não avisar.
 *
 *  3. `console.warn` e não `throw`. Depreciação que quebra a tela não é
 *     depreciação, é remoção.
 */

const jaAvisado = new Set<string>();

export function avisarDepreciado(chave: string, mensagem: string) {
  if (process.env.NODE_ENV === 'production') return;
  if (jaAvisado.has(chave)) return;
  jaAvisado.add(chave);
  console.warn(`[@portal/design-system v2] ${mensagem}`);
}

/** Só para teste: permite reexercitar o aviso. Não use em código de produto. */
export function _limparAvisos() {
  jaAvisado.clear();
}
