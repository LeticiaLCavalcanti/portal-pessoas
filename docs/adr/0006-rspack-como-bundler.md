# ADR 0006 — Rspack como bundler, com Module Federation nativo

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend
- **Substitui:** a escolha de Vite + `@originjs/vite-plugin-federation` feita no início do projeto

## Contexto

A [ADR 0001](0001-module-federation-com-remotes-em-runtime.md) fixou o *modelo*: Module
Federation com remotes resolvidos em runtime a partir do registro do BFF. Ela não fixou a
*implementação*. A primeira versão usou Vite com `@originjs/vite-plugin-federation`, e três
problemas apareceram no uso real:

**1. O registro de remote em runtime dependia de uma API não documentada.**
O shell importava o módulo virtual `__federation__` e chamava
`__federation_method_setRemote` / `__federation_method_getRemote`. Isso não aparece no
README do plugin, não tem garantia de compatibilidade entre versões e não tem tipos. A peça
mais importante da arquitetura — a que sustenta "publicar jornada sem tocar no core" — era
a que estava apoiada no alicerce mais frágil.

**2. Federação não funcionava em desenvolvimento.**
O `vite dev` serve módulos ESM não empacotados; o plugin de federação só age no build do
Rollup. Consequência prática, documentada no próprio README do projeto: *"os remotes
precisam estar buildados; em `vite dev` o shell carrega a própria cópia do React"*. Ou seja,
o modo em que as 10 squads passam o dia **não era o modo que vai para produção**. Toda
classe de bug de singleton (dois Reacts, hook quebrado, contexto duplicado) só aparecia
depois do build — no melhor caso em homologação, no pior em produção.

**3. Duas ferramentas para o mesmo trabalho.**
Vite usa esbuild em dev e Rollup em build. São dois grafos de módulos, dois conjuntos de
regras de resolução e dois lugares onde a federação podia divergir.

## Decisão

Adotar **Rspack** como bundler do shell e de todas as jornadas, usando o
`ModuleFederationPlugin` de `@module-federation/enhanced` e o runtime oficial
`@module-federation/enhanced/runtime` para registrar remotes em runtime.

O modelo da ADR 0001 não muda. O que muda é que ele passa a se apoiar na implementação de
referência do Module Federation, mantida pelo mesmo time que mantém a especificação.

Concretamente:

| Antes | Depois |
|---|---|
| `@originjs/vite-plugin-federation` (terceiro) | `@module-federation/enhanced/rspack` (referência) |
| `import('__federation__')` + `__federation_method_setRemote` | `registerRemotes([{ name, entry, type: 'global' }], { force: true })` |
| `__federation_method_getRemote(nome, './journey')` | `loadRemote('<container>/journey')` |
| Federação só depois de `build` | Federação também em `dev`, com HMR |
| 3 configs de bundler copiadas | `@portal/build-preset`, um lugar para a lista `shared` |

## Consequências

**Positivas**

- **Dev = produção.** O `dev` server já federa e já compartilha singletons. Divergência de
  versão em `shared` aparece na máquina de quem escreveu o código, não na esteira.
- **API pública e tipada** para o registro dinâmico de remotes, com códigos de erro
  documentados (`RUNTIME-002`, `RUNTIME-008`) que o shell traduz para frases de colaborador.
- **Uma ferramenta, um grafo de módulos**, de `dev` a `build`.
- **Build mais rápido** (Rust, paralelo), o que importa quando são N+1 pipelines.
- **`shared` deixa de ser copiada.** `@portal/build-preset` centraliza os singletons e
  deriva o nome do container do `id` do manifesto — a divergência que quebrava hooks em
  produção passa a ser impossível de introduzir por descuido.

**Negativas**

- **Configuração mais verbosa que a do Vite.** Mitigado pelo preset: cada jornada declara
  três linhas (`dir`, `id`, `port`).
- **Fronteira assíncrona obrigatória.** O ponto de entrada precisa ser
  `import('./bootstrap')`, senão o host fixa a própria cópia de React antes da negociação
  de singletons. É um arquivo de uma linha por app, comentado, mas é uma pegadinha real
  para quem chega no projeto.
- **`type: 'global'` no registro de remote.** O `remoteEntry` do Rspack é um container
  clássico carregado por `<script>`, não um ES module. Registrar como `module` falha com
  `RUNTIME-002` — um erro que *parece* "jornada fora do ar" e manda a squad errada
  investigar. Está comentado no código exatamente por isso.
- **Perdemos o dev server do Vite**, que é mais rápido em cold start para app pequeno. Para
  um portal com 4+ builds simultâneos, a conta inverte.

## Alternativas descartadas

| Opção | Por que não |
|---|---|
| **Manter Vite + plugin da comunidade** | O problema não é velocidade, é que federação não valia em `dev` e o registro dinâmico dependia de API privada. Nenhum dos dois se resolve trocando de versão do plugin |
| **Vite + `@module-federation/vite`** | Existe e é oficial, mas o suporte a remotes dinâmicos e a `shared` continua atrás do webpack/Rspack, e o modo `dev` ainda tem ressalvas. Escolher a implementação de referência remove uma variável |
| **webpack 5** | É a implementação de referência histórica e funcionaria. Rspack é compatível com a mesma API e roda em Rust — mesma semântica, build mais rápido. Se o Rspack se mostrar imaturo em algum ponto, a saída é `webpack` com a mesma config, e não uma reescrita |
| **Import maps + ESM nativo** | Resolve carregamento, não resolve compartilhamento com negociação de versão. Voltaríamos a escrever à mão o que o Module Federation já faz |

## Nota sobre reversibilidade

Esta ADR troca a *implementação*, não o *modelo*. `apps/shell/src/platform/loadRemote.ts`
tem 40 linhas úteis e é o único arquivo do shell que conhece o Module Federation. Trocar de
novo de bundler significa reescrever esse arquivo e `@portal/build-preset` — nada em
`journeys/`, `components/`, `pages/` ou no contrato muda. Foi para preservar essa
propriedade que o acoplamento ao bundler ficou concentrado num arquivo só.
