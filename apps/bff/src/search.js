/**
 * ============================================================================
 *  Casamento de termo da busca global
 * ============================================================================
 *
 * Mora fora do `server.js` por dois motivos: `server.js` termina em
 * `await app.listen()`, então importá-lo num teste subiria um servidor; e a
 * regra de casamento é a única lógica de verdade da busca -- o resto da rota é
 * só recorte de permissão.
 *
 * ---------------------------------------------------------------------------
 *  Por que a comparação ignora acento
 * ---------------------------------------------------------------------------
 *
 * Num portal em português, quem digita rápido não acentua. "ferias", "saude",
 * "refeicao" e "decimo" são o que a pessoa REALMENTE escreve na caixa de busca
 * -- e, com comparação literal, todas elas devolviam zero resultado enquanto o
 * item existia no índice. O colaborador conclui que o portal não tem a jornada,
 * não que faltou um acento; ele não tenta de novo com acento, ele desiste.
 *
 * É o pior tipo de falha de busca, porque a tela de "nada encontrado" parece
 * uma resposta legítima do sistema.
 */

/**
 * Reduz o texto a uma forma comparável: sem acento, em minúsculas.
 *
 * `normalize('NFD')` separa a letra do sinal -- "é" vira "e" + U+0301 -- e a
 * faixa U+0300–U+036F (Combining Diacritical Marks) é exatamente o conjunto
 * desses sinais soltos, então apagá-los devolve a letra base.
 *
 * O "ç" entra de brinde e vale dizer, porque não é óbvio: a cedilha é um
 * combining mark (U+0327) dessa mesma faixa, então "refeição" -> "refeicao"
 * sem nenhuma regra especial para português.
 *
 * Não usamos `localeCompare` com `sensitivity: 'base'` porque ele compara
 * cadeias INTEIRAS, e a busca precisa de `includes` -- casar pedaço de título.
 */
export const stripAccents = (text) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Abaixo disto a busca não dispara: com uma letra só, praticamente todo item do
 * índice casa, e a lista de sugestões vira ruído em vez de atalho.
 */
export const MIN_QUERY_LENGTH = 2;

/**
 * @param index         entradas publicadas pelas squads
 * @param query         o que a pessoa digitou, cru
 * @param participants  ids que declaram `capabilities: ['search']` E estão
 *                      visíveis para este colaborador (ver ADR 0009)
 */
export function match(index, query, participants) {
  const term = stripAccents(String(query ?? '').trim());
  if (term.length < MIN_QUERY_LENGTH) return [];

  return index.filter(
    (item) => participants.has(item.journeyId) && stripAccents(item.title).includes(term)
  );
}
