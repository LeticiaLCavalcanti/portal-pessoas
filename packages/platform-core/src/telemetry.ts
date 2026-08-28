import type { JourneyTelemetry } from '@portal/journey-contract';

type Sink = (batch: TelemetryRecord[]) => void;

export interface TelemetryRecord {
  ts: number;
  type: 'event' | 'error' | 'timing';
  name: string;
  correlationId: string;
  sessionId: string;
  journeyId: string;
  squad: string;
  version: string;
  props?: Record<string, unknown>;
}

/**
 * Coletor único do portal.
 *
 * Decisão: telemetria é responsabilidade da PLATAFORMA, não de cada squad.
 * Se cada time escolhesse sua lib, perderiamos a capacidade de responder
 * "a jornada de férias está lenta ou o portal inteiro está lento?".
 *
 * Em produção isto seria o SDK do OpenTelemetry (web) exportando para
 * OTLP -> Collector -> Datadog/Grafana. Aqui mandamos para o BFF em batch.
 */
export function createTelemetryHub(params: { correlationId: string; sessionId: string; sink: Sink }) {
  let buffer: TelemetryRecord[] = [];
  const listeners = new Set<(r: TelemetryRecord) => void>();

  const flush = () => {
    if (!buffer.length) return;
    const batch = buffer;
    buffer = [];
    try { params.sink(batch); } catch { /* telemetria nunca derruba o portal */ }
  };

  const timer = setInterval(flush, 4000);
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
  }

  const push = (r: TelemetryRecord) => {
    buffer.push(r);
    listeners.forEach((l) => l(r));
    if (buffer.length >= 25) flush();
  };

  return {
    /** Cria um emissor já carimbado com a identidade da jornada. */
    forJourney(meta: { journeyId: string; squad: string; version: string }): JourneyTelemetry {
      const base = { ...meta, correlationId: params.correlationId, sessionId: params.sessionId };
      return {
        event: (name, props) => push({ ts: Date.now(), type: 'event', name, ...base, props }),
        error: (err, props) =>
          push({
            ts: Date.now(), type: 'error', name: 'journey.error', ...base,
            props: { message: err instanceof Error ? err.message : String(err), ...props }
          }),
        timing: (name, ms) => push({ ts: Date.now(), type: 'timing', name, ...base, props: { ms } })
      };
    },
    subscribe(cb: (r: TelemetryRecord) => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    flush,
    dispose: () => clearInterval(timer)
  };
}

export type TelemetryHub = ReturnType<typeof createTelemetryHub>;
