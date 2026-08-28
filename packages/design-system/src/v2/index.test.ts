/**
 * ============================================================================
 *  DS v2 — completude da superfície pública
 * ============================================================================
 *
 * A afirmação sob teste (MIGRATION.md §2, e o cabeçalho de ./index.ts):
 *
 *   "/v2 é sempre a superfície COMPLETA do DS. O que tem v2 vem em v2, o que
 *    não tem vem em v1, e a squad não precisa saber a diferença."
 *
 * É a afirmação mais frágil do pacote inteiro, porque quebrá-la é o caminho de
 * menor esforço: alguém acrescenta um componente na v1, não lembra do
 * reexport, e o `/v2` fica com um buraco. A squad que migrar um arquivo que use
 * esse componente recebe um erro de import -- e a conclusão dela não vai ser
 * "faltou um reexport", vai ser "a v2 não está pronta".
 *
 * Este teste é uma lista que se mantém sozinha: ele deriva a expectativa da v1
 * em vez de repetir os nomes à mão. Uma lista escrita à mão aqui teria o mesmo
 * problema do reexport -- alguém teria de lembrar de atualizá-la.
 */
import { describe, it, expect } from 'vitest';
import * as v1 from '../index';
import * as v2 from './index';

/** `v1` é a escotilha de saída da própria v2; não é um componente faltando. */
const NOT_COMPONENTS = new Set(['v1', 'DS_SURFACE']);

describe('superfície pública da v2', () => {
  it('expõe tudo o que a v1 expõe', () => {
    const inV1 = Object.keys(v1);
    const inV2 = new Set(Object.keys(v2));

    const missing = inV1.filter((name) => !inV2.has(name));

    expect(
      missing,
      `Estes nomes existem em @portal/design-system mas não em /v2: ${missing.join(', ')}. ` +
        'Se o componente ganhou v2, exporte a versão nova; se ainda não tem, ' +
        'acrescente ao bloco de reexports da v1 em src/v2/index.ts.'
    ).toEqual([]);
  });

  /**
   * O caminho inverso: um nome que só existe na v2 e que deveria ser um
   * reexport da v1 indicaria que alguém criou componente novo direto na v2
   * pulando a camada. Não é proibido -- é só uma decisão que merece ser
   * consciente, então o teste lista o que apareceu.
   */
  it('só acrescenta nomes que são componentes v2 de fato', () => {
    const inV1 = new Set(Object.keys(v1));
    const onlyInV2 = Object.keys(v2).filter(
      (name) => !inV1.has(name) && !NOT_COMPONENTS.has(name)
    );

    // Hoje: nenhum. Todo componente da v2 substitui um da v1.
    expect(onlyInV2).toEqual([]);
  });

  it('mantém a escotilha de saída para a v1', () => {
    expect(v2.v1).toBeDefined();
    expect(v2.v1.Button).toBe(v1.Button);
  });

  /**
   * Os quatro que a v2 SUBSTITUI precisam ser referências diferentes das da v1.
   * Se um reexport acidental devolvesse o componente da v1 sob o nome novo, os
   * testes de tradução de props em primitives.test.tsx continuariam passando
   * (eles importam de './primitives' direto) e nada acusaria o problema.
   */
  it.each(['Button', 'Badge', 'Card', 'DataList'] as const)(
    '%s da v2 não é o mesmo componente da v1',
    (name) => {
      expect(v2[name]).not.toBe(v1[name]);
    }
  );

  /** O contrário: o que ainda não tem v2 deve ser a MESMA referência. */
  it.each(['Stack', 'Row', 'Text', 'Skeleton', 'Field', 'EmptyState', 'ErrorBoundary', 'Icon', 'Brand', 'Tabs'] as const)(
    '%s é reexportado da v1 sem alteração',
    (name) => {
      expect(v2[name]).toBe(v1[name]);
    }
  );
});
