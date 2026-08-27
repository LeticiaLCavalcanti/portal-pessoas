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
import type { ParaNativo, ParaWeb } from './bridge';

const PORTAL_URL = 'https://portal-pessoas.empresa.com';

export function JourneyWebView({ rota, sessao, tema }: any) {
  const ref = useRef<WebView>(null);

  const enviar = (msg: ParaWeb) =>
    ref.current?.postMessage(JSON.stringify(msg));

  const aoReceber = async (raw: string) => {
    const msg: ParaNativo = JSON.parse(raw);
    switch (msg.type) {
      case 'web:pronto':
        enviar({ type: 'native:session', token: sessao.token, user: sessao.user });
        enviar({ type: 'native:theme', theme: tema });
        break;
      case 'web:pedir-geo': {
        const pos = await obterLocalizacao();
        enviar({ type: 'native:geo', lat: pos.lat, lng: pos.lng });
        break;
      }
      case 'web:pedir-biometria': {
        const ok = await autenticarBiometria(msg.motivo);
        enviar({ type: 'native:biometria', ok, requestId: msg.requestId });
        break;
      }
      case 'web:telemetria':
        coletorNativo.event(msg.name, msg.props);
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
      source={{ uri: `${PORTAL_URL}${rota}` }}
      onMessage={(e) => aoReceber(e.nativeEvent.data)}
      allowsBackForwardNavigationGestures
      // sem isso o portal recarrega inteiro a cada volta de background
      cacheEnabled
    />
  );
}

declare const obterLocalizacao: () => Promise<{ lat: number; lng: number }>;
declare const autenticarBiometria: (motivo: string) => Promise<boolean>;
declare const coletorNativo: { event(n: string, p?: unknown): void };
