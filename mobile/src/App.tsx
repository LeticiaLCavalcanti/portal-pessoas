/**
 * Casca nativa. Note o tamanho: é isso que "camada nativa mínima" significa.
 * Nenhuma regra de RH mora aqui. Nenhuma squad de produto edita este arquivo.
 */
import React from 'react';
import { nativeTheme } from '@portal/tokens/native';
import { JourneyWebView } from './JourneyWebView';

export default function App() {
  const sessao = useSessaoBiometrica();       // keychain + biometria
  const tema = useTemaDoSistema();            // claro/escuro do SO
  const rotaInicial = useDeepLinkOuPush('/'); // push e deep link entram por aqui
  const t = nativeTheme(tema);                // MESMOS tokens do web

  if (!sessao) return <TelaDeLogin tokens={t} />;

  return <JourneyWebView rota={rotaInicial} sessao={sessao} tema={tema} />;
}

declare const useSessaoBiometrica: () => any;
declare const useTemaDoSistema: () => 'light' | 'dark';
declare const useDeepLinkOuPush: (fallback: string) => string;
declare const TelaDeLogin: any;
