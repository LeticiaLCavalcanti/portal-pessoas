/**
 * ============================================================================
 *  DS v1 — ErrorBoundary (o componente da ADR 0007)
 * ============================================================================
 *
 * Este é o único componente do DS que o portal inteiro depende para DEGRADAR
 * bem: a árvore do shell e a de cada uma das dez jornadas passam por ele. Um
 * bug aqui não desenha errado -- ele apaga a tela e some com o retry, que é o
 * sintoma que a ADR 0007 descreve como "indistinguível de travou" para quem usa.
 *
 * As duas decisões não óbvias que este arquivo protege:
 *
 *  1. **Sem `fallback`, o boundary não desenha NADA.** Quem manda na tela de
 *     erro é o shell, avisado por `ctx.fail`. Duas telas de erro empilhadas é
 *     pior que uma. É contraintuitivo o bastante para alguém "consertar" isso
 *     numa manutenção futura.
 *  2. **`resetKey` volta a tentar renderizar.** Sem isso, o botão "tentar de
 *     novo" do shell não tem efeito nenhum -- o estado de erro fica preso e o
 *     colaborador clica num botão morto.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './primitives';

/**
 * O React registra por `console.error` toda exceção capturada por um boundary,
 * mesmo quando o teste a provocou de propósito. Sem silenciar, cada teste daqui
 * despeja um stack trace numa suíte verde.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(cleanup);

function Explode({ deve }: { deve: boolean }) {
  if (deve) throw new Error('falha da jornada');
  return <p>conteúdo da jornada</p>;
}

describe('ErrorBoundary', () => {
  it('renderiza os filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <Explode deve={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('conteúdo da jornada')).toBeDefined();
  });

  it('avisa onError com o erro original', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Explode deve />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toBe('falha da jornada');
  });

  it('desenha o fallback com o erro e uma função de retry', () => {
    render(
      <ErrorBoundary fallback={(retry, erro) => (
        <button type="button" onClick={retry}>{(erro as Error).message}</button>
      )}>
        <Explode deve />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'falha da jornada' })).toBeDefined();
  });

  /** Decisão 1: sem fallback, nada é desenhado — o shell é quem desenha. */
  it('não desenha nada quando não recebe fallback', () => {
    const { container } = render(
      <ErrorBoundary onError={() => {}}>
        <Explode deve />
      </ErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
  });

  /** Decisão 2: mudar a resetKey é o que faz "tentar de novo" ter efeito. */
  it('volta a renderizar quando a resetKey muda', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="tentativa-1" fallback={() => <p>degradado</p>}>
        <Explode deve />
      </ErrorBoundary>
    );
    expect(screen.getByText('degradado')).toBeDefined();

    rerender(
      <ErrorBoundary resetKey="tentativa-2" fallback={() => <p>degradado</p>}>
        <Explode deve={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('degradado')).toBeNull();
    expect(screen.getByText('conteúdo da jornada')).toBeDefined();
  });

  /**
   * O contrário do anterior, e a metade que se perde numa refatoração
   * descuidada: sem mudar a chave, o boundary NÃO pode tentar de novo sozinho.
   * Se ele resetasse a cada render do pai, uma jornada que falha em toda
   * tentativa entraria em laço de montar-explodir-montar.
   */
  it('não reseta sozinho quando a resetKey não muda', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="tentativa-1" fallback={() => <p>degradado</p>}>
        <Explode deve />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary resetKey="tentativa-1" fallback={() => <p>degradado</p>}>
        <Explode deve={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('degradado')).toBeDefined();
  });
});
