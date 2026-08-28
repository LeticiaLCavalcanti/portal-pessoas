/**
 * Hospeda o shell web dentro do app.
 *
 * Pontos de projeto que costumam ser esquecidos e que estão explícitos aqui:
 *  1. O token NUNCA vai na URL — só pela ponte, depois do `web:pronto`.
 *  2. O botão físico de voltar do Android é traduzido em navegação do portal;
 *     sem isso o colaborador sai do app sem querer.
 *  3. A telemetria do web sobe pelo coletor NATIVO, então o trace do app e o do
 *     portal são o mesmo trace.
 */
import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import type { ToNative, ToWeb } from './bridge';

const PORTAL_URL = 'https://portal-pessoas.empresa.com';

export function JourneyWebView({ route, session, theme }: any) {
  const ref = useRef<WebView>(null);

  const send = (msg: ToWeb) =>
    ref.current?.postMessage(JSON.stringify(msg));

  const handleMessage = async (raw: string) => {
    const msg: ToNative = JSON.parse(raw);
    switch (msg.type) {
      case 'web:pronto':
        send({ type: 'native:session', token: session.token, user: session.user });
        send({ type: 'native:theme', theme: theme });
        break;
      case 'web:pedir-geo': {
        const pos = await getLocation();
        send({ type: 'native:geo', lat: pos.lat, lng: pos.lng });
        break;
      }
      case 'web:pedir-biometria': {
        const ok = await authenticateBiometrics(msg.motivo);
        send({ type: 'native:biometria', ok, requestId: msg.requestId });
        break;
      }
      case 'web:telemetria':
        nativeCollector.event(msg.name, msg.props);
        break;
      case 'web:navegou':
        // mantém o título da tela nativa em sincronia com a jornada aberta
        break;
      case 'web:abrir-nativo':
        // jornada kind=native: sai da WebView e abre a tela nativa
        break;
    }
  };

  return (
    <WebView
      ref={ref}
      source={{ uri: `${PORTAL_URL}${route}` }}
      onMessage={(e) => handleMessage(e.nativeEvent.data)}
      allowsBackForwardNavigationGestures
      // sem isso o portal recarrega inteiro a cada volta de background
      cacheEnabled
    />
  );
}

declare const getLocation: () => Promise<{ lat: number; lng: number }>;
declare const authenticateBiometrics: (reason: string) => Promise<boolean>;
declare const nativeCollector: { event(n: string, p?: unknown): void };
