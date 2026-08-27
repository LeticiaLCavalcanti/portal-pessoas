# ADR 0002 — Contrato de jornada agnóstico de framework

- **Status:** aceito
- **Data:** 2026-08

## Contexto
O case exige "substituição futura de tecnologias com impacto controlado". Se o contrato
entre shell e jornada for "exporte um componente React", a organização inteira fica presa
ao React até a próxima reescrita geral.

## Decisão
O contrato é `mount(container: HTMLElement, ctx: JourneyContext) => () => void`.
A jornada cria a própria raiz. O shell só entrega um `<div>` e o contexto.

## Consequências
**Positivas**
- Uma squad pode trocar de framework sem tocar no shell nem nas outras jornadas.
- Árvores separadas ⇒ isolamento de falha real entre jornadas.
- O contrato cabe em uma tela — fácil de versionar e de revisar.

**Negativas**
- Perde-se tipagem de props ponta a ponta, Context e Suspense compartilhados.
- O desmonte passa a ser responsabilidade da squad; sem ele, vazamento de memória.
  Mitigação: o `create-jornada` já gera o desmonte, e o shell mede árvores órfãs.
- **Árvores separadas também significam que o error boundary do shell não enxerga a
  jornada.** O isolamento não vem de graça com a fronteira: ele precisa de um canal
  explícito. Ver [ADR 0007](0007-falha-de-render-atravessa-fronteira-de-raiz.md), que
  levou o contrato para 1.1 com `ctx.fail`.
- **O desmonte precisa sair do commit do React do shell** (`queueMicrotask`), senão o
  React avisa sobre desmonte síncrono durante render. Também detalhado na ADR 0007.

## Estado do contrato

| Versão | O que mudou | Compatibilidade |
|---|---|---|
| 1.0 | `mount/unmount`, `JourneyContext` com sessão, http, telemetria, navegação, tema, flags e toasts | — |
| **1.1** | `+ ctx.fail(error)` — a jornada devolve ao shell o controle da tela em falha irrecuperável | Aditivo. Jornadas 1.0 montam sem alteração |
