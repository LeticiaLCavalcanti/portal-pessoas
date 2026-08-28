/**
 * ============================================================================
 *  Casamento de termo da busca global
 * ============================================================================
 *
 * Mora fora do `server.js` por dois motivos: `server.js` termina em
 * `await app.listen()`, entao importa-lo num teste subiria um servidor; e a
 * regra de casamento e a unica logica de verdade da busca -- o resto da rota e
 * so recorte de permissao.
 *
 * ---------------------------------------------------------------------------
 *  Por que a comparacao ignora acento
 * ---------------------------------------------------------------------------
 *
 * Num portal em portugues, quem digita rapido nao acentua. "ferias", "saude",
 * "refeicao" e "decimo" sao o que a pessoa REALMENTE escreve na caixa de busca
 * -- e, com comparacao literal, todas elas devolviam zero resultado enquanto o
 * item existia no indice. O colaborador conclui que o portal nao tem a jornada,
 * nao que faltou um acento; ele nao tenta de novo com acento, ele desiste.
 *
 * E o pior tipo de falha de busca, porque a tela de "nada encontrado" parece
 * uma resposta legitima do sistema.
 */

/**
 * Reduz o texto a uma forma comparavel: sem acento, em minusculas.
 *
 * `normalize('NFD')` separa a letra do sinal -- "é" vira "e" + U+0301 -- e a
 * faixa U+0300–U+036F (Combining Diacritical Marks) e exatamente o conjunto
 * desses sinais soltos, entao apaga-los devolve a letra base.
 *
 * O "ç" entra de brinde e vale dizer, porque nao e obvio: a cedilha e um
 * combining mark (U+0327) dessa mesma faixa, entao "refeição" -> "refeicao"
 * sem nenhuma regra especial para portugues.
 *
 * Nao usamos `localeCompare` com `sensitivity: 'base'` porque ele compara
 * cadeias INTEIRAS, e a busca precisa de `includes` -- casar pedaco de titulo.
 */
export const semAcento = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Abaixo disto a busca nao dispara: com uma letra so, praticamente todo item do
 * indice casa, e a lista de sugestoes vira ruido em vez de atalho.
 */
export const TAMANHO_MINIMO = 2;

/**
 * @param indice        entradas publicadas pelas squads
 * @param consulta      o que a pessoa digitou, cru
 * @param participantes ids que declaram `capabilities: ['search']` E estao
 *                      visiveis para este colaborador (ver ADR 0009)
 */
export function casar(indice, consulta, participantes) {
  const termo = semAcento(String(consulta ?? '').trim());
  if (termo.length < TAMANHO_MINIMO) return [];

  return indice.filter(
    (item) => participantes.has(item.journeyId) && semAcento(item.title).includes(termo)
  );
}
