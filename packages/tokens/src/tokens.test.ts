/**
 * ============================================================================
 *  @portal/tokens — as duas invariantes da camada L0.5
 * ============================================================================
 *
 * **1. `tokens.css` não pode divergir de `tokens.json`.**
 *
 * O cabeçalho de `scripts/generate.mjs` afirma:
 *
 *   "O CI roda este script e falha se o resultado divergir do arquivo
 *    commitado, impedindo que alguém edite o CSS na mão e crie uma segunda
 *    fonte de verdade."
 *
 * Até este arquivo existir, **nada** fazia essa verificação -- a afirmação era
 * uma intenção documentada. Um `--c-accent-bg` editado à mão no CSS
 * sobreviveria até a próxima vez que alguém rodasse `npm run tokens`, e aí
 * sumiria sem explicação, levando junto a correção que alguém tinha feito.
 *
 * Este teste checa a INVARIANTE (todo token do JSON está no CSS, e todo token
 * do CSS vem do JSON) em vez de rodar o gerador e comparar bytes. Comparar
 * bytes acusaria diferença de formatação como se fosse divergência de valor, e
 * exigiria escrever no disco durante o teste.
 *
 * **2. Toda variável que o código emite precisa existir.**
 *
 * Esta é a invariante do bug do `--pp-space-4` (README, "Uma nota sobre tokens
 * que não existem"): `Stack` e `Row` emitiram por meses `gap: var(--pp-space-4)`,
 * um prefixo que nunca existiu. Custom property indefinida não gera erro, não
 * aparece no console e não quebra o build -- a declaração vira inválida em
 * tempo de cômputo e o `gap` volta para `normal`, ou seja, ZERO. Todo
 * espaçamento do portal sumiu em silêncio.
 *
 * A correção estrutural foi tipar `space()`. Este teste fecha o outro lado:
 * garante que o alvo da função existe de fato no CSS gerado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { space, token, alias, type SpaceStep } from './index';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'tokens.css'), 'utf8');
const source = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

/** Nomes de custom property DECLARADOS no CSS gerado (o lado esquerdo do `:`). */
const declared = new Set(
  [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]!)
);

const withoutDoc = (obj: Record<string, unknown>) =>
  Object.keys(obj).filter((k) => !k.startsWith('_'));

describe('tokens.css é derivado de tokens.json, não editado à mão', () => {
  it.each([
    ['alias', 'c-'],
    ['space', 'space-'],
    ['radius', 'radius-'],
    ['textStyle', 'ts-'],
    ['motion', 'motion-']
  ] as const)('declara todo token de %s', (block, prefix) => {
    const missing = withoutDoc(source[block]).filter((k) => !declared.has(`--${prefix}${k}`));
    expect(missing, `Faltam no CSS: ${missing.join(', ')}. Rode \`npm run tokens\`.`).toEqual([]);
  });

  it('declara os extras (os únicos com valor literal, por serem exceção ao IDS)', () => {
    const missing = withoutDoc(source.extras).filter((k) => !declared.has(`--${k}`));
    expect(missing).toEqual([]);
  });

  it('declara todo override de tema escuro', () => {
    const missing = withoutDoc(source.darkOverrides).filter((k) => {
      const name = k.startsWith('shadow') ? `--${k}` : `--c-${k}`;
      return !declared.has(name);
    });
    expect(missing).toEqual([]);
  });

  /**
   * O caminho inverso -- o que pega a edição à mão.
   *
   * Um `--c-alguma-coisa` acrescentado direto no CSS passaria por todos os
   * testes acima, porque eles só olham do JSON para o CSS.
   */
  it('não tem nenhum --c-* no CSS que não venha do mapa de alias', () => {
    const known = new Set([
      ...withoutDoc(source.alias),
      ...withoutDoc(source.darkOverrides).filter((k) => !k.startsWith('shadow'))
    ]);

    const orphans = [...declared]
      .filter((v) => v.startsWith('--c-'))
      .map((v) => v.slice('--c-'.length))
      .filter((name) => !known.has(name));

    expect(
      orphans,
      `Estes --c-* estão no CSS e não no tokens.json: ${orphans.join(', ')}. ` +
        'O CSS é gerado — a mudança tem de entrar no JSON.'
    ).toEqual([]);
  });

  /**
   * A regra que dá sentido à camada L0.5 (ADR 0005): o CSS gerado não contém
   * NENHUM valor de cor, só `var(--ids_*)`. É isso que faz uma versão nova do
   * IDS chegar ao portal sem rebuild de nenhuma jornada.
   *
   * As duas exceções são declaradas e auditáveis: o bloco `extras` (o que o IDS
   * não cobre) e o `darkOverrides` (aproximação até o tema escuro oficial).
   */
  it('não tem valor de cor cru no tema claro — só repasse do IDS', () => {
    const lightTheme = css.slice(
      css.indexOf("[data-theme='light']"),
      css.indexOf("[data-theme='dark']")
    );

    const rawHex = [...lightTheme.matchAll(/^\s*(--[\w-]+):\s*(#[0-9a-f]{3,8}|rgba?\()/gim)]
      .map((m) => m[1]!);

    expect(
      rawHex,
      `Cor literal no tema claro: ${rawHex.join(', ')}. ` +
        'Toda cor tem de ser var(--ids_*) — ver ADR 0005.'
    ).toEqual([]);
  });
});

describe('as funções emitem nomes que existem de verdade', () => {
  /**
   * O teste do bug do `--pp-space-4`. Se `space()` voltar a montar o nome por
   * template string com o prefixo errado, isto fica vermelho -- em vez de todo
   * `gap` do portal virar zero em silêncio.
   */
  it.each([1, 2, 3, 4, 5, 6, 7, 8] as SpaceStep[])('space(%i) aponta para uma variável declarada', (n) => {
    const emitted = space(n);
    expect(emitted).toBe(`var(--space-${n})`);
    expect(declared.has(`--space-${n}`)).toBe(true);
  });

  it('token() aponta para uma variável declarada, para todo alias do mapa', () => {
    const broken = Object.keys(alias)
      .filter((name) => !declared.has(`--c-${name}`));
    expect(broken).toEqual([]);
  });

  it('token() monta o nome com o prefixo --c-', () => {
    expect(token('fg-muted')).toBe('var(--c-fg-muted)');
  });
});
