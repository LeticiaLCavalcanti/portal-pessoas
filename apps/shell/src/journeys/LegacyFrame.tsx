/**
 * Adaptador de jornada LEGADA: iframe com ponte postMessage.
 *
 * Decisao, preco assumido e notas de seguranca: docs/adr/0003.
 *
 * Mensagens da ponte, nos dois sentidos, no tipo `BridgeMessage` abaixo.
 */
import * as React from 'react';
import type { JourneyContext, JourneyManifest } from '@portal/journey-contract';

type BridgeMessage =
  | { type: 'portal:legacy:ready'; journeyId: string }
  | { type: 'portal:legacy:resize'; height: number }
  | { type: 'portal:legacy:navigate'; route: string }
  | { type: 'portal:legacy:telemetry'; name: string; props?: Record<string, unknown> }
  | { type: 'portal:legacy:notify'; message: string; kind?: 'info' | 'success' | 'danger' };

export function LegacyFrame({ manifest, ctx }: { manifest: JourneyManifest; ctx: JourneyContext }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(520);
  const [ready, setReady] = React.useState(false);
  const origin = React.useMemo(() => new URL(manifest.entry).origin, [manifest.entry]);

  /**
   * Tema por ASSINATURA, nunca lendo `ctx.theme`: `ctx` e memoizado, entao
   * `ctx.theme` congela no valor da montagem. Depender dele deixava o legado
   * branco dentro de um portal escuro pelo resto da sessao.
   */
  const [tema, setTema] = React.useState(ctx.theme);
  React.useEffect(() => ctx.onThemeChange(setTema), [ctx]);

  // O handshake acontece dentro de um listener de longa duracao, que enxerga o
  // `tema` do render em que foi criado -- por isso a leitura passa pelo ref.
  const temaRef = React.useRef(tema);
  temaRef.current = tema;

  React.useEffect(() => {
    const t0 = performance.now();
    const onMessage = (ev: MessageEvent<BridgeMessage>) => {
      // Confianca por origem: sem isto qualquer aba poderia falar com o shell.
      if (ev.origin !== origin) return;
      const msg = ev.data;
      switch (msg?.type) {
        case 'portal:legacy:ready':
          setReady(true);
          ctx.telemetry.timing('legacy.tempo_ate_pronto', Math.round(performance.now() - t0));
          // Handshake: so aqui o legado recebe identidade, tema e token.
          ref.current?.contentWindow?.postMessage(
            {
              type: 'portal:host:init',
              user: { firstName: ctx.user.firstName, registration: ctx.user.registration },
              theme: temaRef.current,
              token: 'token-simulado'
            },
            origin
          );
          break;
        case 'portal:legacy:resize':
          setHeight(Math.max(320, msg.height));
          break;
        case 'portal:legacy:navigate':
          ctx.navigate(msg.route);
          break;
        case 'portal:legacy:telemetry':
          ctx.telemetry.event(msg.name, msg.props);
          break;
        case 'portal:legacy:notify':
          ctx.notify(msg.message, msg.kind);
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [ctx, origin]);

  // Tema propagado em runtime: sem isso o legado pisca branco no modo escuro.
  React.useEffect(() => {
    if (ready) ref.current?.contentWindow?.postMessage({ type: 'portal:host:theme', theme: tema }, origin);
  }, [tema, ready, origin]);

  return (
    <iframe
      ref={ref}
      title={manifest.name}
      src={manifest.entry}
      style={{ width: '100%', height, border: 0, display: 'block', borderRadius: 'var(--radius-lg)' }}
      sandbox="allow-scripts allow-same-origin allow-forms"
      referrerPolicy="no-referrer"
    />
  );
}
