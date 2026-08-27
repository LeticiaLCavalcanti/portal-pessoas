# App móvel — casca nativa mínima

Este diretório **não é executável** no case. Ele documenta, com código real, o desenho da
camada nativa: o que fica em Swift/Kotlin/RN, o que é WebView e como a ponte funciona.

Rodar um app React Native completo não acrescentaria nada à avaliação da *arquitetura* —
e a decisão relevante é exatamente onde traçar a linha entre nativo e web.

## A linha

```
┌──────────────────────────────────────────────────────┐
│ Casca nativa (React Native) — time de plataforma     │
│  · login + biometria      · push notifications        │
│  · keychain / keystore    · deep links                │
│  · tabs raiz              · câmera, GPS               │
│  · cache offline          · atualização OTA           │
├──────────────────────────────────────────────────────┤
│ Ponte tipada (postMessage)                            │
│  sessão · tema · geolocalização · biometria           │
│  telemetria · navegação                               │
├──────────────────────────────────────────────────────┤
│ WebView → o MESMO shell web, com as MESMAS jornadas   │
│  nenhuma squad de produto escreve código mobile       │
└──────────────────────────────────────────────────────┘
```

Uma jornada só sai da WebView e vira tela nativa (`kind: "native"` no manifesto) quando
depende de hardware de forma crítica ou precisa funcionar offline de verdade. É exceção
justificada, não regra — e o manifesto já suporta isso sem mudança no contrato.

## Arquivos

- `src/App.tsx` — casca: abas, sessão, push, deep link
- `src/JourneyWebView.tsx` — hospeda o shell web e implementa o lado nativo da ponte
- `src/bridge.ts` — protocolo da ponte, compartilhado com o web
