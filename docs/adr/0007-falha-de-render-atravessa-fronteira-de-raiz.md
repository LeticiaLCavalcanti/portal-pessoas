# ADR 0007 — Isolamento de falha atravessa a fronteira de raiz React (`ctx.fail`)

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend
- **Contrato:** `@portal/journey-contract` 1.0 → **1.1** (aditivo)

## Contexto

A [ADR 0002](0002-contrato-agnostico-de-framework.md) fixou o contrato como
`mount(container, ctx) => unmount`. A consequência técnica é que **cada jornada cria a
própria raiz React** (`createRoot`) dentro do elemento que o shell cede.

O shell envolvia a área da jornada num error boundary (`JourneyBoundary`) e o princípio nº 3
("falha de uma squad não pode virar falha do portal") era considerado atendido.

Não estava. Um error boundary do React **não atravessa fronteira de raiz** — ele só enxerga
a árvore de onde foi montado. Um erro de render dentro da jornada:

1. subia até a raiz da própria jornada, que não tinha boundary;
2. fazia o React desmontar aquela árvore inteira;
3. deixava um `<div>` **vazio** na tela;
4. e não avisava o shell de nada.

Resultado para o colaborador: o menu, a busca e as notificações continuavam funcionando —
o isolamento de falha *do portal* estava certo — mas onde deveria estar a jornada havia um
retângulo em branco, sem mensagem, sem código de rastreio e sem "tentar de novo". Do ponto
de vista de quem usa, é indistinguível de "o portal travou".

Isso não era hipótese: o botão **"Quebrar esta jornada"**, que existe no case justamente
para demonstrar isolamento de falha, demonstrava o contrário.

## Decisão

Acrescentar **um** método ao `JourneyContext`:

```ts
/** Reporta uma falha irrecuperavel; o shell assume a superficie degradada. */
fail(error: unknown): void;
```

A squad captura o erro **na tecnologia dela** — error boundary do React, `try/catch` do
Svelte, `onErrorCaptured` do Vue — e devolve o controle ao shell. O shell mostra a mesma
superfície degradada de sempre: mensagem, código de rastreio, "tentar de novo" e, quando o
manifesto declara `fallbackJourneyId`, "abrir versão anterior".

Para que ninguém precise reimplementar o boundary, `@portal/design-system` passa a exportar
um `ErrorBoundary` genérico. Ele é L1 (primitivo) e não conhece o contrato: recebe
`onError`, e é a jornada que liga esse `onError` ao seu `ctx.fail`.

`JourneyBoundary`, no shell, continua existindo — ele cobre a árvore que o **shell** desenha
em volta da jornada. As duas peças são necessárias porque são duas árvores.

## Por que isso é *minor* e não *major*

O contrato ganhou uma capacidade que o **shell fornece**, não uma obrigação que a jornada
precise cumprir. Uma jornada que declara `contractVersion: '1.0'` e nunca chama `fail`
continua montando sem nenhuma alteração — ela apenas volta a degradar mal, que é o
comportamento que já tinha. Nenhuma janela de suporte N-2 é consumida.

## Consequências

**Positivas**

- O princípio nº 3 passa a valer de verdade, e é demonstrável em 2 cliques.
- Tela de erro **uniforme** entre as 10 squads: o colaborador vê a mesma coisa, com
  rastreio, independentemente de quem escreveu a jornada.
- O erro chega à telemetria carimbado com jornada/squad/versão — antes ele se perdia no
  `window.onerror` sem dono.

**Negativas**

- **É honestidade, não automatismo.** Uma squad que esquecer o boundary volta ao retângulo
  vazio. Mitigação: o `ErrorBoundary` vem pronto no DS, o harness de desenvolvimento
  isolado implementa `fail` de forma visível, e o template de jornada já nasce com ele.
- **Mais um campo no contrato**, que a ADR 0002 pede para manter mínimo. Aceito: sem ele o
  princípio nº 3 é falso, e um contrato pequeno que mente é pior que um contrato com um
  campo a mais.

## Nota relacionada — desmonte fora do commit

Duas raízes React na mesma página trazem um segundo efeito: o shell chama o `unmount` da
jornada de dentro do cleanup de um efeito, ou seja, com o React **dele** no meio de um
commit. Desmontar outra raiz de forma síncrona ali gera
*"Attempted to synchronously unmount a root while React was already rendering"* e tem risco
real de race. Por isso o `unmount` de cada jornada adia o desmonte um microtask
(`queueMicrotask`).

É custo estrutural do contrato agnóstico: o preço de `mount(HTMLElement)` em vez de
"devolva um componente React", pago em troca da liberdade de a squad trocar de framework
([ADR 0002](0002-contrato-agnostico-de-framework.md)). As três jornadas trazem uma nota
curta no `unmount` apontando para cá.

## Alternativas descartadas

| Opção | Por que não |
|---|---|
| **`window.onerror` no shell** | Captura o erro, mas não sabe de qual jornada veio nem em que estado ela estava. Atribuir a squad errada é pior que não atribuir |
| **Contrato devolver um componente React** | Resolveria o boundary de graça e mataria a portabilidade de framework, que é requisito explícito do case |
| **O shell montar a jornada na própria árvore via portal** | Exigiria que toda jornada fosse React. Mesma objeção |
| **Deixar cada squad desenhar sua própria tela de erro** | Dez telas de erro diferentes, nenhuma com código de rastreio padronizado. A consistência de degradação é justamente o que o time de plataforma tem de garantir |
