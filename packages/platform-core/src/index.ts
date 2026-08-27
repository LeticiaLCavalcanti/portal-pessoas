/**
 * @portal/platform-core
 *
 * Capacidades transversais do portal: HTTP, telemetria, rollout, sessao.
 * Nao contem NADA de negocio e nada de UI -- por isso pode ser consumido
 * tanto pelo shell web quanto pelo app React Native.
 */
export * from './http';
export * from './telemetry';
export * from './rollout';

export const newCorrelationId = () =>
  `pp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
