/**
 * Nucleo do shell: sessao, catalogo, flags, tema, telemetria e avisos.
 *
 * Regra de projeto: TUDO que e transversal mora aqui e e entregue as jornadas
 * pelo `JourneyContext`. As squads nao instanciam auth, nao criam seu proprio
 * cliente HTTP e nao escolhem sua propria lib de telemetria. Sem isso, com 10+
 * times, o portal vira 10 portais dentro de uma casca comum.
 */
import * as React from 'react';
import {
  journeyManifestSchema, type JourneyManifest, type JourneyUser
} from '@portal/journey-contract';
import {
  createHttpClient, createTelemetryHub, newCorrelationId, type TelemetryHub, type TelemetryRecord
} from '@portal/platform-core';

const BFF = 'http://localhost:4000';

export type Theme = 'light' | 'dark';
export interface Toast { id: number; message: string; kind: 'info' | 'success' | 'danger' }

interface PortalState {
  status: 'carregando' | 'pronto' | 'erro';
  user: JourneyUser | null;
  journeys: JourneyManifest[];
  /** Manifestos invalidos: nao sobem, mas sao reportados. Governanca visivel. */
  rejected: { id: string; problem: string }[];
  flags: Record<string, boolean>;
  theme: Theme;
  toggleTheme(): void;
  toasts: Toast[];
  notify(message: string, kind?: Toast['kind']): void;
  correlationId: string;
  sessionId: string;
  telemetry: TelemetryHub;
  http: ReturnType<typeof createHttpClient>;
  telemetryLog: TelemetryRecord[];
  journeyById(id: string): JourneyManifest | undefined;
  journeyByRoute(route: string): JourneyManifest | undefined;
}

const Ctx = React.createContext<PortalState | null>(null);
export const usePortal = () => {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('usePortal fora do PortalProvider');
  return v;
};

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const correlationId = React.useMemo(newCorrelationId, []);
  const sessionId = React.useMemo(() => `s-${Math.random().toString(36).slice(2, 10)}`, []);

  const [status, setStatus] = React.useState<PortalState['status']>('carregando');
  const [user, setUser] = React.useState<JourneyUser | null>(null);
  const [journeys, setJourneys] = React.useState<JourneyManifest[]>([]);
  const [rejected, setRejected] = React.useState<{ id: string; problem: string }[]>([]);
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [telemetryLog, setTelemetryLog] = React.useState<TelemetryRecord[]>([]);
  const [theme, setTheme] = React.useState<Theme>(
    () => (localStorage.getItem('pp:theme') as Theme) ?? 'light'
  );

  const http = React.useMemo(
    () => createHttpClient({ baseUrl: BFF, getToken: () => 'token-simulado', correlationId, journeyId: 'shell' }),
    [correlationId]
  );

  const telemetry = React.useMemo(
    () =>
      createTelemetryHub({
        correlationId,
        sessionId,
        sink: (batch) => {
          // keepalive: nao perdemos o ultimo lote quando o colaborador fecha a aba
          fetch(`${BFF}/v1/telemetry`, {
            method: 'POST', keepalive: true,
            headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId },
            body: JSON.stringify(batch)
          }).catch(() => undefined);
        }
      }),
    [correlationId, sessionId]
  );

  // Painel de observabilidade embutido: e o "console de arquitetura" do case.
  React.useEffect(
    () => {
      const off = telemetry.subscribe((r) => setTelemetryLog((prev) => [r, ...prev].slice(0, 60)));
      return () => { off(); };
    },
    [telemetry]
  );

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pp:theme', theme);
  }, [theme]);

  React.useEffect(() => {
    const t0 = performance.now();
    (async () => {
      try {
        const [me, raw, fl] = await Promise.all([
          http.get<JourneyUser>('/v1/me'),
          http.get<unknown[]>('/v1/journeys'),
          http.get<Record<string, boolean>>('/v1/flags')
        ]);

        /**
         * GOVERNANCA EM RUNTIME: todo manifesto passa pelo schema antes de virar
         * rota. Um manifesto malformado publicado por uma squad derruba a
         * PROPRIA jornada -- nunca o portal inteiro. Sem esta validacao, um
         * campo errado de um time quebra a navegacao de 40 mil pessoas.
         */
        const ok: JourneyManifest[] = [];
        const bad: { id: string; problem: string }[] = [];
        for (const item of raw) {
          const parsed = journeyManifestSchema.safeParse(item);
          if (parsed.success) ok.push(parsed.data);
          else bad.push({
            id: (item as any)?.id ?? '(sem id)',
            problem: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          });
        }

        setUser(me); setJourneys(ok); setRejected(bad); setFlags(fl); setStatus('pronto');
        const shellTelemetry = telemetry.forJourney({ journeyId: 'shell', squad: 'plataforma', version: '1.0.0' });
        shellTelemetry.timing('shell.boot', Math.round(performance.now() - t0));
        shellTelemetry.event('shell.catalogo.carregado', { validos: ok.length, rejeitados: bad.length });
        bad.forEach((b) => shellTelemetry.error(new Error(`manifesto invalido: ${b.id}`), b));
      } catch (e) {
        setStatus('erro');
      }
    })();
  }, [http, telemetry]);

  const notify = React.useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const value: PortalState = {
    status, user, journeys, rejected, flags, theme,
    toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    toasts, notify, correlationId, sessionId, telemetry, http, telemetryLog,
    journeyById: (id) => journeys.find((j) => j.id === id),
    journeyByRoute: (route) => journeys.find((j) => route === j.route || route.startsWith(`${j.route}/`))
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
