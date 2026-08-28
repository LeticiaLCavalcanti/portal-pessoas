/**
 * ============================================================================
 *  Contrato shell <-> jornada
 * ============================================================================
 *
 * O contrato é o único acoplamento entre o core e as dez squads, então errar
 * aqui é errar para todo mundo ao mesmo tempo. Duas coisas sob teste:
 *
 * **1. O portão de versão.** `isContractCompatible` decide se o shell monta ou
 * recusa uma jornada. Um bug que o faça devolver `true` demais monta uma
 * jornada de major incompatível e quebra em runtime, dentro do bundle da squad,
 * longe do shell. Um bug que devolva `false` demais tira jornadas boas do ar.
 * É a função mais barata de testar e a mais cara de errar do repositório.
 *
 * **2. O catálogo de verdade.** O `registry.json` é o artefato de OPERAÇÃO --
 * ele muda sem passar por build (é essa a graça: "publicar jornada sem alterar
 * o core"). Justamente por isso ele é o arquivo do repositório com maior chance
 * de receber um typo que ninguém compila. Validar o arquivo real contra o
 * schema Zod move esse erro para o CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  isContractCompatible,
  journeyManifestSchema,
  CONTRACT_VERSION,
  SUPPORTED_CONTRACT_MAJOR
} from './index';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const registry = JSON.parse(
  readFileSync(join(repoRoot, 'apps/bff/src/registry.json'), 'utf8')
) as { journeys: unknown[] };

describe('isContractCompatible', () => {
  it('aceita a mesma major, inclusive minor mais nova', () => {
    expect(isContractCompatible('1.0')).toBe(true);
    expect(isContractCompatible('1.1')).toBe(true);
    expect(isContractCompatible('1.9')).toBe(true);
  });

  /**
   * A propriedade que a ADR 0007 comprou ao ir para 1.1: `ctx.fail` é ADITIVO,
   * então jornadas 1.0 continuam montando sem alteração. Se este teste ficar
   * vermelho, dez squads precisam publicar no mesmo dia.
   */
  it('aceita jornadas 1.0 mesmo com o shell implementando 1.1', () => {
    expect(CONTRACT_VERSION).toBe('1.1');
    expect(isContractCompatible('1.0')).toBe(true);
  });

  it('recusa major diferente', () => {
    expect(isContractCompatible('2.0')).toBe(false);
    expect(isContractCompatible('0.9')).toBe(false);
  });

  /**
   * Jornada sem `contractVersion` é jornada antiga demais ou bundle corrompido.
   * O shell precisa recusar, não adivinhar -- montar às cegas é o caminho para
   * o retângulo vazio da ADR 0007.
   */
  it.each([undefined, '', 'latest', 'v1', 'abc'])('recusa %o', (valor) => {
    expect(isContractCompatible(valor as string | undefined)).toBe(false);
  });

  it('concorda com a major que o shell diz suportar', () => {
    expect(isContractCompatible(`${SUPPORTED_CONTRACT_MAJOR}.0`)).toBe(true);
  });
});

describe('registry.json — o catálogo real do BFF', () => {
  it('tem jornadas', () => {
    expect(registry.journeys.length).toBeGreaterThan(0);
  });

  it('valida inteiro contra o schema do manifesto', () => {
    const errors = registry.journeys
      .map((j, i) => {
        const r = journeyManifestSchema.safeParse(j);
        return r.success ? null : `journeys[${i}]: ${r.error.issues.map((e) => `${e.path.join('.')} ${e.message}`).join('; ')}`;
      })
      .filter(Boolean);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  it('não repete id — o id é a chave do container federado', () => {
    const ids = registry.journeys.map((j) => journeyManifestSchema.parse(j).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('não repete rota — duas jornadas na mesma rota é ambiguidade de roteamento', () => {
    const routes = registry.journeys.map((j) => journeyManifestSchema.parse(j).route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  /**
   * `fallbackJourneyId` é o kill switch da ADR 0010: quando o remote falha, o
   * shell oferece a versão legada. Apontar para uma jornada que não existe no
   * registro transforma a degradação graciosa em segunda falha -- e o
   * colaborador clica em "Abrir versão anterior" para lugar nenhum.
   */
  it('só aponta fallback para jornada que existe no registro', () => {
    const manifestos = registry.journeys.map((j) => journeyManifestSchema.parse(j));
    const ids = new Set(manifestos.map((m) => m.id));

    const quebrados = manifestos
      .filter((m) => m.rollout.fallbackJourneyId && !ids.has(m.rollout.fallbackJourneyId))
      .map((m) => `${m.id} -> ${m.rollout.fallbackJourneyId}`);

    expect(quebrados, `Fallback apontando para jornada inexistente: ${quebrados.join(', ')}`).toEqual([]);
  });
});
