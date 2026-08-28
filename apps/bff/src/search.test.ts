/**
 * ============================================================================
 *  Busca global — a participação é declarada no manifesto
 * ============================================================================
 *
 * A afirmação sob teste está na ADR 0009 e na proposta §3:
 *
 *   "Quer aparecer na busca? Declare `capabilities: ['search']`. O shell não
 *    muda. É dado, não código."
 *
 * Essa frase já foi FALSA uma vez: o `/v1/search` varria o índice inteiro sem
 * consultar o manifesto, e `ferias-legado` — que declarava `capabilities: []`
 * — aparecia nos resultados assim mesmo. A ADR estava certa no papel e o código
 * fazia outra coisa.
 *
 * O que torna essa classe de regressão perigosa é o formato dela: nada quebra.
 * Não há erro, não há log, a busca continua devolvendo resultados. Só que o
 * mecanismo que o texto promete não é o mecanismo que roda — e a diferença só
 * aparece quando alguém confere.
 *
 * Estes testes checam a REGRA, sobre os arquivos reais do repositório, e não um
 * caso particular: qualquer jornada que entre no índice sem declarar a
 * capacidade (ou o contrário) fica vermelho.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// O BFF é JS puro, sem tipos publicados. `allowJs` no tsconfig.test.json deixa
// o TS inferir a forma a partir do próprio módulo; o `as IndexEntry[]` abaixo é o
// que dá nome a ela dentro deste arquivo.
import { searchIndex } from './data.js';

interface Manifest {
  id: string;
  route: string;
  capabilities: string[];
  requiredRoles: string[];
  showInCatalog: boolean;
}
interface IndexEntry {
  journeyId: string;
  title: string;
  route: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const journeys = (
  JSON.parse(readFileSync(join(here, 'registry.json'), 'utf8')) as { journeys: Manifest[] }
).journeys;

const index = searchIndex as IndexEntry[];

const declareSearch = new Set(
  journeys.filter((j) => j.capabilities.includes('search')).map((j) => j.id)
);
const appearInIndex = new Set(index.map((h) => h.journeyId));

describe('índice de busca × manifesto', () => {
  /**
   * A direção que estava quebrada. Uma entrada de jornada que não pediu para
   * participar é um resultado que o manifesto não autoriza.
   */
  it('toda jornada no índice declara capabilities:["search"]', () => {
    const missingCapability = [...appearInIndex].filter((id) => !declareSearch.has(id));

    expect(
      missingCapability,
      `Estas jornadas publicam entradas no índice mas não declaram a capacidade: ` +
        `${missingCapability.join(', ')}. Ou declare capabilities:["search"] no registry.json, ` +
        'ou remova as entradas do searchIndex — hoje elas seriam descartadas em silêncio.'
    ).toEqual([]);
  });

  /**
   * A direção oposta, que é ruído em vez de bug: a jornada é contada como
   * participante da busca e nunca devolve nada.
   */
  it('toda jornada que declara busca publicou pelo menos uma entrada', () => {
    const missingEntries = [...declareSearch].filter((id) => !appearInIndex.has(id));

    expect(
      missingEntries,
      `Estas jornadas declaram capabilities:["search"] mas não publicaram entrada: ${missingEntries.join(', ')}.`
    ).toEqual([]);
  });

  /**
   * A "REGRA DE HIGIENE" que o comentário do data.js já enunciava e que nada
   * verificava: um resultado que leva a uma rota fora da jornada dona é, para o
   * colaborador, indistinguível de link quebrado.
   */
  it('toda rota do índice cai dentro da jornada que a publicou', () => {
    const byId = new Map(journeys.map((j) => [j.id, j]));

    const strays = index
      .filter((h) => {
        const owner = byId.get(h.journeyId);
        if (!owner) return true;
        return h.route !== owner.route && !h.route.startsWith(`${owner.route}/`);
      })
      .map((h) => `${h.journeyId}: ${h.route}`);

    expect(
      strays,
      `Rotas fora da jornada dona: ${strays.join(', ')}`
    ).toEqual([]);
  });

  /**
   * Jornada de fallback não entra na busca: ela existe para o kill switch da
   * ADR 0010, e indexá-la duplicaria os resultados da jornada moderna
   * equivalente.
   */
  it('jornada fora do catálogo não participa da busca', () => {
    const outOfCatalog = journeys.filter((j) => j.showInCatalog === false);
    expect(outOfCatalog.length).toBeGreaterThan(0); // o cenário existe no registro

    const improper = outOfCatalog
      .filter((j) => j.capabilities.includes('search') || appearInIndex.has(j.id))
      .map((j) => j.id);

    expect(improper).toEqual([]);
  });
});

/**
 * ============================================================================
 *  Casamento do termo — a busca em português não pode exigir acento
 * ============================================================================
 *
 * Bug encontrado em uso: digitar "ferias" não devolvia nada, embora
 * "Programar férias" estivesse no índice. A comparação era literal, então o
 * acento virava requisito de digitação.
 *
 * É a pior forma de falha de busca porque não parece falha: a tela de "nada
 * encontrado" é uma resposta plausível do sistema, e o colaborador conclui que
 * o portal não tem a jornada — não que faltou um acento. Ele não tenta de novo.
 */
import { match, stripAccents } from './search.js';

const ALL = new Set(index.map((h) => h.journeyId));

describe('stripAccents', () => {
  it.each([
    ['férias', 'ferias'],
    ['Plano de saúde', 'plano de saude'],
    ['Vale refeição', 'vale refeicao'],
    ['Décimo terceiro', 'decimo terceiro'],
    ['Justificar ausência', 'justificar ausencia']
  ])('%s → %s', (entrada, esperado) => {
    expect(stripAccents(entrada)).toBe(esperado);
  });

  /** A cedilha é combining mark da mesma faixa — não precisa de regra própria. */
  it('trata ç sem regra especial para português', () => {
    expect(stripAccents('refeição')).toBe('refeicao');
    expect(stripAccents('Coparticipação')).toBe('coparticipacao');
  });

  it('é idempotente — texto já sem acento não muda', () => {
    expect(stripAccents('banco de horas')).toBe('banco de horas');
  });
});

describe('match — o bug relatado', () => {
  const titles = (q: string) => match(index, q, ALL).map((h: IndexEntry) => h.title);

  it('acha "Programar férias" digitando sem acento', () => {
    expect(titles('ferias')).toContain('Programar férias');
  });

  /** As quatro combinações: termo e título, cada um com e sem acento. */
  it.each(['ferias', 'férias', 'FERIAS', 'Férias'])('acha com "%s"', (q) => {
    expect(titles(q)).toContain('Programar férias');
  });

  it('acha "Informe de rendimentos" por trecho no meio do título', () => {
    expect(titles('rendimentos')).toContain('Informe de rendimentos');
  });

  it('respeita o tamanho mínimo — uma letra casaria quase tudo', () => {
    expect(match(index, 'f', ALL)).toEqual([]);
    expect(match(index, ' ', ALL)).toEqual([]);
    expect(match(index, '', ALL)).toEqual([]);
  });

  it('continua honrando a lista de participantes', () => {
    expect(match(index, 'ferias', new Set<string>())).toEqual([]);
  });

  it('não inventa resultado para termo que não existe', () => {
    expect(titles('rescisao')).toEqual([]);
  });
});
