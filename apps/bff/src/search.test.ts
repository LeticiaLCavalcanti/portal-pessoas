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
// o TS inferir a forma a partir do próprio módulo; o `as Entrada[]` abaixo é o
// que dá nome a ela dentro deste arquivo.
import { searchIndex } from './data.js';

interface Manifesto {
  id: string;
  route: string;
  capabilities: string[];
  requiredRoles: string[];
  showInCatalog: boolean;
}
interface Entrada {
  journeyId: string;
  title: string;
  route: string;
}

const aqui = dirname(fileURLToPath(import.meta.url));
const jornadas = (
  JSON.parse(readFileSync(join(aqui, 'registry.json'), 'utf8')) as { journeys: Manifesto[] }
).journeys;

const indice = searchIndex as Entrada[];

const declaramBusca = new Set(
  jornadas.filter((j) => j.capabilities.includes('search')).map((j) => j.id)
);
const aparecemNoIndice = new Set(indice.map((h) => h.journeyId));

describe('índice de busca × manifesto', () => {
  /**
   * A direção que estava quebrada. Uma entrada de jornada que não pediu para
   * participar é um resultado que o manifesto não autoriza.
   */
  it('toda jornada no índice declara capabilities:["search"]', () => {
    const semDeclarar = [...aparecemNoIndice].filter((id) => !declaramBusca.has(id));

    expect(
      semDeclarar,
      `Estas jornadas publicam entradas no índice mas não declaram a capacidade: ` +
        `${semDeclarar.join(', ')}. Ou declare capabilities:["search"] no registry.json, ` +
        'ou remova as entradas do searchIndex — hoje elas seriam descartadas em silêncio.'
    ).toEqual([]);
  });

  /**
   * A direção oposta, que é ruído em vez de bug: a jornada é contada como
   * participante da busca e nunca devolve nada.
   */
  it('toda jornada que declara busca publicou pelo menos uma entrada', () => {
    const semIndice = [...declaramBusca].filter((id) => !aparecemNoIndice.has(id));

    expect(
      semIndice,
      `Estas jornadas declaram capabilities:["search"] mas não publicaram entrada: ${semIndice.join(', ')}.`
    ).toEqual([]);
  });

  /**
   * A "REGRA DE HIGIENE" que o comentário do data.js já enunciava e que nada
   * verificava: um resultado que leva a uma rota fora da jornada dona é, para o
   * colaborador, indistinguível de link quebrado.
   */
  it('toda rota do índice cai dentro da jornada que a publicou', () => {
    const porId = new Map(jornadas.map((j) => [j.id, j]));

    const forasteiras = indice
      .filter((h) => {
        const dona = porId.get(h.journeyId);
        if (!dona) return true;
        return h.route !== dona.route && !h.route.startsWith(`${dona.route}/`);
      })
      .map((h) => `${h.journeyId}: ${h.route}`);

    expect(
      forasteiras,
      `Rotas fora da jornada dona: ${forasteiras.join(', ')}`
    ).toEqual([]);
  });

  /**
   * Jornada de fallback não entra na busca: ela existe para o kill switch da
   * ADR 0010, e indexá-la duplicaria os resultados da jornada moderna
   * equivalente.
   */
  it('jornada fora do catálogo não participa da busca', () => {
    const foraDoCatalogo = jornadas.filter((j) => j.showInCatalog === false);
    expect(foraDoCatalogo.length).toBeGreaterThan(0); // o cenário existe no registro

    const indevidas = foraDoCatalogo
      .filter((j) => j.capabilities.includes('search') || aparecemNoIndice.has(j.id))
      .map((j) => j.id);

    expect(indevidas).toEqual([]);
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
import { casar, semAcento } from './busca.js';

const TODOS = new Set(indice.map((h) => h.journeyId));

describe('semAcento', () => {
  it.each([
    ['férias', 'ferias'],
    ['Plano de saúde', 'plano de saude'],
    ['Vale refeição', 'vale refeicao'],
    ['Décimo terceiro', 'decimo terceiro'],
    ['Justificar ausência', 'justificar ausencia']
  ])('%s → %s', (entrada, esperado) => {
    expect(semAcento(entrada)).toBe(esperado);
  });

  /** A cedilha é combining mark da mesma faixa — não precisa de regra própria. */
  it('trata ç sem regra especial para português', () => {
    expect(semAcento('refeição')).toBe('refeicao');
    expect(semAcento('Coparticipação')).toBe('coparticipacao');
  });

  it('é idempotente — texto já sem acento não muda', () => {
    expect(semAcento('banco de horas')).toBe('banco de horas');
  });
});

describe('casar — o bug relatado', () => {
  const titulos = (q: string) => casar(indice, q, TODOS).map((h: Entrada) => h.title);

  it('acha "Programar férias" digitando sem acento', () => {
    expect(titulos('ferias')).toContain('Programar férias');
  });

  /** As quatro combinações: termo e título, cada um com e sem acento. */
  it.each(['ferias', 'férias', 'FERIAS', 'Férias'])('acha com "%s"', (q) => {
    expect(titulos(q)).toContain('Programar férias');
  });

  it('acha "Informe de rendimentos" por trecho no meio do título', () => {
    expect(titulos('rendimentos')).toContain('Informe de rendimentos');
  });

  it('respeita o tamanho mínimo — uma letra casaria quase tudo', () => {
    expect(casar(indice, 'f', TODOS)).toEqual([]);
    expect(casar(indice, ' ', TODOS)).toEqual([]);
    expect(casar(indice, '', TODOS)).toEqual([]);
  });

  it('continua honrando a lista de participantes', () => {
    expect(casar(indice, 'ferias', new Set<string>())).toEqual([]);
  });

  it('não inventa resultado para termo que não existe', () => {
    expect(titulos('rescisao')).toEqual([]);
  });
});
