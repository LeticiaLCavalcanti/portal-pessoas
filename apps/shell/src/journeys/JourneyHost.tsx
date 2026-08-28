/**
 * JourneyHost -- resolve rollout, monta a jornada conforme o `kind`, injeta o
 * JourneyContext, degrada em falha e instrumenta tudo por jornada/squad/versao.
 *
 * O shell nao conhece ponto, beneficios nem holerite: so monta e desmonta o que
 * respeita o contrato (docs/adr/0002).
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { isContractCompatible, type JourneyContext, type JourneyManifest } from '@portal/journey-contract';
import { resolveRollout, createHttpClient } from '@portal/platform-core';
import { Badge, Button, Card, EmptyState, Icon, Row, Skeleton, Stack, Text } from '@portal/design-system';
import { usePortal } from '../platform/portal';
import { loadJourneyModule } from '../platform/loadRemote';
import { LegacyFrame } from './LegacyFrame';
import { JourneyBoundary } from './JourneyBoundary';

type Phase =
  | { s: 'loading' }
  | { s: 'mounted'; ms: number }
  | { s: 'error'; message: string; step: 'load' | 'render' };

export function JourneyHost({ manifest, path }: { manifest: JourneyManifest; path: string }) {
  const portal = usePortal();
  const navigate = useNavigate();
  const user = portal.user!;

  /** Decisao de rollout: acontece ANTES de qualquer download de bundle. */
  const rollout = React.useMemo(() => resolveRollout(manifest, user), [manifest, user]);
  const fallback = manifest.rollout.fallbackJourneyId
    ? portal.journeyById(manifest.rollout.fallbackJourneyId)
    : undefined;

  const effective = rollout.active ? manifest : fallback ?? manifest;
  const degraded = !rollout.active && !!fallback;

  return (
    <Stack gap={4}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Stack gap={1}>
          <Text size="xxl" as="h1">{manifest.name}</Text>
          <Text size="sm" tone="muted">{manifest.description}</Text>
        </Stack>
        <Row gap={2}>
          {degraded && <Badge tone="warn">versão anterior · rollout {manifest.rollout.percentage}%</Badge>}
        </Row>
      </Row>

      <JourneyBoundary
        journeyId={effective.id}
        onError={(e) =>
          portal.telemetry
            .forJourney({ journeyId: effective.id, squad: effective.squad, version: effective.version })
            .error(e, { step: 'render' })
        }
        fallback={(retry) => (
          <Card>
            <EmptyState
              mark={<Icon name="alert" size={30} />}
              title="Esta jornada parou de responder"
              description={`O restante do portal continua funcionando. Código de rastreio ${portal.correlationId}.`}
              action={<Button onClick={retry}>Tentar de novo</Button>}
            />
          </Card>
        )}
      >
        <JourneySurface manifest={effective} origin={manifest} path={path} navigate={navigate} />
      </JourneyBoundary>
    </Stack>
  );
}

function JourneySurface({
  manifest, origin, path, navigate
}: {
  manifest: JourneyManifest;
  /** Manifesto pedido na URL. Pode diferir de `manifest` quando o rollout degrada. */
  origin: JourneyManifest;
  path: string;
  navigate: (to: string) => void;
}) {
  const portal = usePortal();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [phase, setPhase] = React.useState<Phase>({ s: 'loading' });
  const [attempt, setAttempt] = React.useState(0);

  const pathListeners = React.useRef(new Set<(p: string) => void>());
  const themeListeners = React.useRef(new Set<(t: 'light' | 'dark') => void>());
  const themeRef = React.useRef(portal.theme);

  /**
   * Canal de falha vindo de DENTRO da jornada (docs/adr/0007).
   *
   * Atras de um ref porque `ctx` e memoizado: com `fail` nas dependencias, cada
   * re-render do shell criaria um `ctx` novo e REMONTARIA a jornada.
   */
  const failRef = React.useRef<(e: unknown) => void>(() => undefined);
  failRef.current = (e: unknown) => {
    portal.telemetry
      .forJourney({ journeyId: manifest.id, squad: manifest.squad, version: manifest.version })
      .error(e, { step: 'render' });
    setPhase({ s: 'error', message: e instanceof Error ? e.message : String(e), step: 'render' });
  };

  const ctx: JourneyContext = React.useMemo(() => {
    const telemetry = portal.telemetry.forJourney({
      journeyId: manifest.id, squad: manifest.squad, version: manifest.version
    });
    return {
      user: portal.user!,
      // x-journey-id permite ao BFF atribuir latencia e erro ao time certo.
      http: createHttpClient({
        baseUrl: 'http://localhost:4000',
        getToken: () => 'token-simulado',
        correlationId: portal.correlationId,
        journeyId: manifest.id
      }),
      telemetry,
      navigate: (to) => navigate(to.startsWith('/') ? to : `${manifest.route}/${to}`),
      path,
      onPathChange: (cb) => { pathListeners.current.add(cb); return () => pathListeners.current.delete(cb); },
      theme: themeRef.current,
      onThemeChange: (cb) => { themeListeners.current.add(cb); return () => themeListeners.current.delete(cb); },
      flags: portal.flags,
      notify: portal.notify,
      fail: (e) => failRef.current(e)
    };
    /**
     * Dependencias deliberadamente curtas. Cada uma delas REMONTA a jornada.
     *  - `path` fica de fora: navegacao interna e notificada por onPathChange.
     *  - `theme` fica de fora: e notificado por onThemeChange e, na pratica,
     *    o repintar vem das custom properties do DS, sem codigo na squad.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.id, manifest.version, manifest.route, portal.user, portal.flags]);

  React.useEffect(() => { pathListeners.current.forEach((cb) => cb(path)); }, [path]);
  React.useEffect(() => {
    themeRef.current = portal.theme;
    themeListeners.current.forEach((cb) => cb(portal.theme));
  }, [portal.theme]);

  /** Montagem do microfrontend moderno. */
  React.useEffect(() => {
    if (manifest.kind !== 'remote') return;
    let unmount: (() => void) | undefined;
    let cancelled = false;
    const t0 = performance.now();
    setPhase({ s: 'loading' });

    loadJourneyModule({
      id: manifest.id, version: manifest.version, entry: manifest.entry,
      exposedModule: manifest.exposedModule, timeoutMs: manifest.budget.loadTimeoutMs
    })
      .then(async (mod) => {
        if (cancelled) return;
        if (!isContractCompatible(mod.contractVersion)) {
          throw new Error(
            `Contrato incompatível: a jornada implementa v${mod.contractVersion} e o shell suporta v1.x`
          );
        }
        const el = containerRef.current;
        if (!el) return;
        unmount = await mod.mount(el, ctx);
        if (cancelled) { unmount?.(); return; }
        const ms = Math.round(performance.now() - t0);
        setPhase({ s: 'mounted', ms });
        ctx.telemetry.timing('jornada.tempo_de_montagem', ms);
        ctx.telemetry.event('jornada.montada', { kind: manifest.kind });
      })
      .catch((e) => {
        if (cancelled) return;
        setPhase({
          s: 'error',
          message: e instanceof Error ? e.message : String(e),
          step: 'load'
        });
        // Na telemetria vai o erro TECNICO completo (`cause`), nao a frase
        // amigavel: quem le isto e a squad dona, de madrugada, no alerta.
        ctx.telemetry.error((e as { cause?: unknown })?.cause ?? e, {
          step: 'load',
          entry: manifest.entry,
          displayedMessage: e instanceof Error ? e.message : String(e)
        });
      });

    return () => { cancelled = true; unmount?.(); };
  }, [manifest.id, manifest.version, manifest.kind, manifest.entry, manifest.exposedModule,
      manifest.budget.loadTimeoutMs, ctx, attempt]);

  if (manifest.kind === 'legacy') {
    return (
      <Card style={{ padding: 'var(--space-2)' }}>
        <LegacyFrame manifest={manifest} ctx={ctx} />
      </Card>
    );
  }

  if (manifest.kind === 'native') {
    return (
      <Card>
        <EmptyState
          mark="[ app ]"
          title="Disponível apenas no aplicativo"
          description="Esta jornada usa recursos do dispositivo (biometria e câmera) e roda na camada nativa."
        />
      </Card>
    );
  }

  /**
   * Rota da versao anterior. O `origin` cobre a degradacao em cascata: a
   * moderna falhou, o shell ja tinha caido no fallback de rollout, e o
   * fallback tambem falhou.
   */
  const fallbackId = manifest.rollout.fallbackJourneyId ?? origin.rollout.fallbackJourneyId;
  const fallbackRoute = fallbackId ? portal.journeyById(fallbackId)?.route : undefined;

  return (
    <>
      {phase.s === 'loading' && (
        <Card>
          <Stack gap={3}>
            <Skeleton h={22} w="42%" />
            <Skeleton h={72} />
            <Skeleton h={72} />
          </Stack>
        </Card>
      )}

      {phase.s === 'error' && (
        <Card>
          <EmptyState
            mark={<Icon name="alert" size={30} />}
            title={
              phase.step === 'render'
                ? 'Esta jornada parou de responder'
                : 'Não foi possível abrir esta jornada'
            }
            description={`${phase.message} · Rastreio ${portal.correlationId}`}
            action={
              <Row gap={2} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button onClick={() => setAttempt((a) => a + 1)}>Tentar de novo</Button>
                {fallbackRoute && (
                  <Button variant="secondary" onClick={() => navigate(fallbackRoute)}>
                    Abrir versão anterior
                  </Button>
                )}
              </Row>
            }
          />
        </Card>
      )}

      {/* O container fica sempre montado: e o "buraco" onde a squad desenha. */}
      <div ref={containerRef} hidden={phase.s !== 'mounted'} />

      {phase.s === 'mounted' && (
        <Text size="xs" tone="subtle" mono style={{ marginTop: 'var(--space-3)' }}>
          carregada via module federation de {manifest.entry} em {phase.ms}ms
        </Text>
      )}
    </>
  );
}
