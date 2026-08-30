# ADR 0012 — Admitir um segundo framework no portal: o que custa, medido

- **Status:** aceito como **spike**, com data de revisão
- **Data:** 2026-08
- **Decisores:** plataforma frontend
- **Revisar até:** 2027-02 (ou antes, se aparecer o segundo consumidor de Angular)
- **Relacionada:** [0002](0002-contrato-agnostico-de-framework.md) (o contrato),
  [0001](0001-module-federation-com-remotes-em-runtime.md) (como a jornada chega),
  [0006](0006-rspack-como-bundler.md) (o bundler),
  [0005](0005-adotar-o-itau-design-system-como-l0.md) (a camada de tokens)

## Contexto

A [ADR 0002](0002-contrato-agnostico-de-framework.md) afirma que o contrato entre o shell e
as jornadas é agnóstico de framework: `mount(container, ctx)` devolvendo `unmount`, sem
nenhum tipo do React atravessando a fronteira. É uma afirmação forte — ela é o que sustenta
"substituir a tecnologia de uma jornada sem tocar no portal" — e até aqui ela estava
**apenas escrita**. Todas as jornadas do repositório são React.

Uma afirmação de arquitetura que nunca foi executada é uma hipótese. Este spike existe para
transformá-la em fato ou em correção, e para produzir a informação que a decisão real vai
exigir quando ela aparecer: uma aquisição com time e produto prontos, um fornecedor que só
entrega naquele stack, uma squad inteira que já é especialista.

A pergunta do spike não é "dá para rodar Angular dentro do shell". É **"o que muda no
pipeline, no deploy e no custo recorrente quando muda o framework"**.

## Decisão

Publicar a jornada `teste-angular` (`apps/journey-teste-angular`, rota
`/teste-angular`) como um microfrontend **Angular 21, standalone, zoneless**, carregado
pelo mesmo Module Federation, descoberto pelo mesmo registro do BFF e implementando o mesmo
contrato v1.1 das demais.

Ela é **um spike marcado como tal na própria tela**, não uma jornada de produto. Fica no
catálogo porque um experimento que não é exercitado apodrece — e porque a tela é o lugar
mais honesto para registrar o resultado.

### O que foi preciso mudar no portal

| Arquivo | Mudança |
| --- | --- |
| `apps/bff/src/registry.json` | uma entrada — como para qualquer jornada |
| `packages/build-preset/src/index.mjs` | `angularJourneyConfig()`, ao lado de `journeyConfig()` |
| `packages/design-system/src/primitives/Icon.tsx` | o ícone `beaker` ([ADR 0008](0008-iconografia-por-nome-semantico.md)) |
| `package.json`, `scripts/*.mjs` | o workspace e a porta 5005 |

**`apps/shell/` não foi tocado.** Nem uma linha. É o resultado que o spike foi buscar.

### Publicada em produção, fora da máquina

A jornada foi publicada num provedor externo (Vercel) e o `entry` do registro passou a apontar
para lá. O portal carrega o bundle Angular de outro domínio, sem rebuild e sem restart do
shell — o que fecha as duas perguntas de uma vez: a compatibilidade (o contrato atravessa o
framework) e o deploy independente (a origem do artefato é configuração, não código).

Isso exigiu uma mudança no build: o `publicPath` da jornada passou a ser `'auto'`, porque o
endereço de publicação só é conhecido **depois** do deploy. O detalhe, e o que foi verificado,
estão em [Build e deploy de um módulo apartado, §12](../02-build-e-deploy.md).

### O que atravessou a fronteira de framework

Todo o contrato v1.1, item por item — `user`, `http`, `telemetry`, `navigate`, `path`,
`onPathChange`, `theme`, `onThemeChange`, `flags`, `notify`, `fail` — mais a camada de
tokens e as classes `ds-*` do Design System. É por isso que a jornada é indistinguível das
outras na tela, inclusive no tema escuro.

Vale registrar que a camada CSS do DS já era publicada **sem hash de propósito** para este
caso; o comentário em `@portal/build-preset` que dizia "e um dia outro framework" deixou de
ser hipotético.

### O que NÃO atravessou

**Os componentes React do DS.** `<Card>`, `<Button>` e `<Icon>` são React. Na jornada
Angular eles viraram marcação sobre as mesmas classes — ou seja, **uma segunda
implementação para manter em sincronia**. Este, e não bundle size, é o custo estrutural de
admitir outro framework.

A saída de arquitetura, se isso deixasse de ser spike, seria promover a camada L1 do DS a
Web Components e deixar React e Angular como invólucros finos por cima. Não foi feito aqui:
seria reescrever o DS para provar um ponto sobre o pipeline.

## O que muda no deploy

Nada do que o portal depende para publicar, ativar, degradar ou reverter uma jornada mudou —
o fluxo completo está em [Build e deploy de um módulo apartado](../02-build-e-deploy.md).
Build, artefato (`remoteEntry.js` + chunks), publicação no CDN sob o prefixo da squad,
`JOURNEY_PUBLIC_PATH` no CI, `PATCH` de `version`/`entry` no registro, rollout por
`percentage`/`allowlist`/`fallbackJourneyId`, rollback por `PATCH` de volta com
`registerRemotes(…, { force: true })`, timeout de carga, tela degradada e telemetria
tagueada por squad: idênticos.

O que muda são quatro coisas.

**1. O CI precisa de um segundo toolchain.** Angular exige decorators legados e
`decoratorMetadata` no loader de TypeScript — configuração incompatível com a das jornadas
React na mesma passada. Isso virou `angularJourneyConfig()` **dentro de
`@portal/build-preset`**, e não um pipeline paralelo: o `rspack.config.mjs` da squad
continua com quatro linhas e a lista `SHARED_SINGLETONS` continua tendo um dono só. Um
segundo framework não pode virar um segundo pipeline; vira uma variante do caminho
pavimentado, mantida por plataforma.

**2. `shared` fica vazio, e o preço é real.** React, react-dom e o DS chegam nas outras
jornadas pelo shell; esta não importa nenhum deles. E o Angular dela não serve para
ninguém, porque não há um segundo consumidor. Medido no build de produção, contando o
`remoteEntry` mais os chunks do módulo exposto:

| | gzip | bruto |
| --- | ---: | ---: |
| `teste-angular` (Angular, JIT) | ~294 KB | ~1004 KB |
| `holerite` (React, com singletons do shell) | ~37 KB | ~130 KB |

A diferença não é "Angular é pesado": é que **o compilador do Angular viaja dentro do
bundle**. O spike usa JIT porque é o que faz o Angular caber no mesmo Rspack das outras
jornadas, sem um segundo pipeline. O caminho de AOT com Module Federation clássico hoje
passa por webpack + `@ngtools/webpack`, que o Rspack ainda não suporta de primeira classe;
a decisão real seria entre manter esta jornada em webpack no CI da squad, ou adotar
`@angular/build` com native federation e ensinar o shell a carregar remote ESM/import-map
além de `type: 'global'`. Nenhuma das duas é necessária para provar a fronteira, e as duas
são necessárias para produção.

**3. A regra do singleton não muda por causa disto.** Um pacote entra em
`SHARED_SINGLETONS` quando ganha o **segundo** consumidor, não o primeiro: compartilhar com
um só custa coordenação de versão entre squads e economiza zero byte. Se aparecer uma
segunda jornada Angular, `@angular/*` entra na lista e as duas squads passam a subir de
major juntas — exatamente o custo que as jornadas React já pagam com o React.

**4. O gate de CI que importa é agnóstico de framework.** O Vitest do repositório é
React + jsdom e não compila componente Angular; a squad traz o próprio runner dentro do
workspace dela, como qualquer squad. O que a plataforma exige de todo mundo é outro teste:
um **smoke de federação** que baixa o artefato *publicado*, chama `loadRemote()` e verifica
`contractVersion` e `typeof mount === 'function'`. É ele que impede a classe de erro
"publicou num formato que o portal não reconhece" (`RUNTIME-002`, já traduzida em
`apps/shell/src/platform/loadRemote.ts`) de chegar ao colaborador.

## Critérios de admissão

Um framework novo só entra em produção se:

1. **Não patcheia globais.** Esta jornada é *zoneless*: sem zone.js. zone.js sobrescreve
   `setTimeout`, `Promise` e `addEventListener` no escopo global, que é compartilhado com o
   shell React, com as outras jornadas e com o iframe do legado. É o único item
   inegociável da lista — os outros são prazo, este é contaminação entre times.
2. **AOT no pipeline**, tirando o compilador do bundle.
3. **Orçamento de bytes declarado no manifesto** e verificado no CI, como
   `budget.loadTimeoutMs` já é.
4. **Smoke de federação obrigatório** contra o artefato publicado.
5. **Dono nomeado** para a esteira de major, com nome de pessoa e não de time.
6. **ADR com data de revisão** — esta.

## Consequências

**Positivas.** A afirmação central da ADR 0002 deixou de ser hipótese: a fronteira é o
contrato, não o React. Isso muda a natureza de duas conversas futuras — a de aquisição de
um time com stack próprio, e a de migrar o portal para outra tecnologia daqui a alguns
anos, que agora pode ser jornada a jornada em vez de big bang. E o custo de dizer sim está
medido antes de alguém precisar da resposta.

**Negativas.** Existe um segundo framework no repositório, com uma esteira de major, uma
superfície de CVE e um conjunto de componentes de DS a mais para manter. Este spike deixa a
porta **documentada**, não aberta: a arquitetura suportar N frameworks não é razão para ter
N frameworks, e eu recusaria um segundo framework por preferência técnica de uma squad.

**Descartado.** *Não* fazer o spike e confiar no argumento de que o contrato é agnóstico —
era o estado anterior, e ele não sobreviveria à primeira pergunta de custo. *Migrar* uma
jornada existente para Angular em vez de criar uma nova: destruiria testes e histórico reais
para provar algo sobre build. *Reescrever o DS em Web Components* antes de ter o segundo
consumidor: custo grande, contra um benefício que ainda é hipotético.
