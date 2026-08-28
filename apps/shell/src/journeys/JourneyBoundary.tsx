/**
 * Isolamento de falha do lado do SHELL: cobre a árvore que o shell desenha em
 * volta da jornada, NÃO a árvore da squad.
 *
 * O outro lado da fronteira é coberto por `ctx.fail`. Por que são duas peças:
 * docs/adr/0007.
 */
import * as React from 'react';
import { ErrorBoundary } from '@portal/design-system';

export function JourneyBoundary({
  journeyId,
  onError,
  fallback,
  children
}: {
  journeyId: string;
  onError(e: unknown): void;
  fallback: (retry: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary resetKey={journeyId} onError={onError} fallback={(retry) => fallback(retry)}>
      {children}
    </ErrorBoundary>
  );
}
