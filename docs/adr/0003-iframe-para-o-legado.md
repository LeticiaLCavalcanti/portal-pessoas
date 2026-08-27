# ADR 0003 — iframe com ponte postMessage para jornadas legadas

- **Status:** aceito
- **Data:** 2026-08

## Contexto
As jornadas legadas têm CSS global, jQuery e renderização no servidor. Precisam conviver
com o portal moderno durante toda a migração, sem serem reescritas antes.

## Decisão
Embarcar o legado em iframe (web) / WebView (app), com uma ponte `postMessage` de ~40 linhas
injetada no template antigo: altura, handshake de sessão, tema, navegação e telemetria.

## Consequências
**Positivas**
- Isolamento de CSS, JS e erro sem tocar no código legado.
- O legado passa a emitir telemetria pelo mesmo coletor ⇒ comparação legado × moderno é confiável.
- O colaborador vê uma navegação única desde a primeira release.

**Negativas**
- Acessibilidade, gestão de foco e histórico exigem trabalho manual e nunca ficam perfeitos.
- Altura do iframe depende do `ResizeObserver` do lado legado.
- Aceito como **estado transitório com data de desligamento**, não como arquitetura final.

## Segurança
`sandbox` restritivo, verificação de `event.origin` nos dois lados, token entregue apenas
no handshake — nunca na querystring.
