/**
 * ============================================================================
 *  containerNameOf — a tradução que os dois lados da fronteira precisam acertar
 * ============================================================================
 *
 * O arquivo testado é importado do build (`rspack.config.mjs` de cada jornada)
 * E do runtime (`apps/shell/src/platform/loadRemote.ts`). Se as duas pontas
 * discordarem, o shell registra o remote "holerite" e o bundle se anuncia como
 * "holerite_legado" -- e o sintoma é uma jornada que existe no menu, responde
 * 200 no `remoteEntry.js` e mesmo assim não monta.
 *
 * A função é uma linha. Ela é testada mesmo assim porque o custo do erro não
 * tem relação com o tamanho dela, e porque o teste abaixo não checa só a
 * tradução: checa a PROPRIEDADE que a tradução precisa garantir para todo id
 * que existe no registro de verdade.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Importado pelo SUBPATH do pacote, e não por caminho relativo: é exatamente
// assim que `apps/shell/src/platform/loadRemote.ts` consome em runtime. Testar
// pelo mesmo caminho do consumidor exercita também o mapa de `exports` do
// pacote -- um subpath quebrado no package.json apareceria aqui.
import { containerNameOf } from '@portal/build-preset/container-name';

const raizDoRepo = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const registry = JSON.parse(
  readFileSync(join(raizDoRepo, 'apps/bff/src/registry.json'), 'utf8')
) as { journeys: { id: string }[] };

/** Identificador válido de JavaScript — o que o Module Federation exige. */
const VALID_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

describe('containerNameOf', () => {
  it('troca kebab-case por snake_case', () => {
    expect(containerNameOf('holerite-legado')).toBe('holerite_legado');
    expect(containerNameOf('ferias-legado')).toBe('ferias_legado');
  });

  it('deixa id de uma palavra intacto', () => {
    expect(containerNameOf('holerite')).toBe('holerite');
    expect(containerNameOf('ponto')).toBe('ponto');
  });

  it('troca TODOS os hífens, não só o primeiro', () => {
    expect(containerNameOf('a-b-c-d')).toBe('a_b_c_d');
  });

  it('é idempotente — aplicar duas vezes não muda o resultado', () => {
    const uma = containerNameOf('holerite-legado');
    expect(containerNameOf(uma)).toBe(uma);
  });

  /**
   * A propriedade que importa, verificada contra o catálogo real: todo id
   * publicado precisa virar um identificador que o Module Federation consegue
   * usar como nome de container. O schema do manifesto já restringe o id a
   * `[a-z0-9-]+`, então esta é a outra metade da garantia.
   */
  it('produz identificador JS válido para todo id do registro', () => {
    const invalid = registry.journeys
      .map((j) => ({ id: j.id, name: containerNameOf(j.id) }))
      .filter(({ name }) => !VALID_IDENTIFIER.test(name));

    expect(
      invalid,
      `Ids que não viram name de container válido: ${JSON.stringify(invalid)}`
    ).toEqual([]);
  });

  /**
   * Dois ids diferentes não podem colidir no mesmo nome de container -- seria
   * um remote sobrescrevendo o outro no escopo global de federação, com a
   * jornada errada montando na rota certa.
   */
  it('não colide entre os ids do registro', () => {
    const names = registry.journeys.map((j) => containerNameOf(j.id));
    expect(new Set(names).size).toBe(names.length);
  });
});
