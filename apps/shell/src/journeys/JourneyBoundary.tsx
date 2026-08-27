/**
 * Isolamento de falha do lado do SHELL.
 *
 * Cobre a arvore que o shell renderiza em volta da jornada (cabecalho, titulo,
 * estados de carregamento). NAO cobre a arvore da squad: a jornada monta
 * a propria raiz React dentro do container cedido, e error boundary nao
 * atravessa fronteira de raiz.
 *
 * Esse outro lado e coberto por `ctx.fail` (contrato v1.1): a squad captura na
 * tecnologia dela e devolve o controle ao shell, que mostra a MESMA superficie
 * degradada -- ver JourneyHost.
 *
 * A logica de boundary em si vem do DS, para nao existirem duas implementacoes
 * do mesmo comportamento no portal.
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
