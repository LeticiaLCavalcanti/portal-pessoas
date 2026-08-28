/**
 * Casca nativa. Note o tamanho: é isso que "camada nativa mínima" significa.
 * Nenhuma regra de RH mora aqui. Nenhuma squad de produto edita este arquivo.
 */
import React from 'react';
import { nativeTheme } from '@portal/tokens/native';
import { JourneyWebView } from './JourneyWebView';

export default function App() {
  const session = useBiometricSession();       // keychain + biometria
  const theme = useSystemTheme();            // claro/escuro do SO
  const initialRoute = useDeepLinkOrPush('/'); // push e deep link entram por aqui
  const t = nativeTheme(theme);                // MESMOS tokens do web

  if (!session) return <LoginScreen tokens={t} />;

  return <JourneyWebView route={initialRoute} session={session} theme={theme} />;
}

declare const useBiometricSession: () => any;
declare const useSystemTheme: () => 'light' | 'dark';
declare const useDeepLinkOrPush: (fallback: string) => string;
declare const LoginScreen: any;
