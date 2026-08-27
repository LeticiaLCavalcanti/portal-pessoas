# Decisões de arquitetura (ADRs)

Registro das decisões estruturais do Portal Pessoas: o contexto em que cada uma foi
tomada, o que foi decidido, o que se paga por ela e o que foi descartado no caminho.

**A justificativa arquitetural mora aqui, não em comentário de código.** O código aponta
para a ADR (`ver docs/adr/0007`) quando a linha existe por causa de uma decisão registrada.
Comentário no código fica reservado para o que é local: uma armadilha de runtime, um efeito
colateral não óbvio, o motivo de uma linha parecer estranha.

| # | Decisão | Assunto |
|---|---|---|
| [0001](0001-module-federation-com-remotes-em-runtime.md) | Module Federation com remotes resolvidos em runtime | Publicar jornada sem tocar no core |
| [0002](0002-contrato-agnostico-de-framework.md) | Contrato de jornada agnóstico de framework | `mount/unmount`, substituição de tecnologia |
| [0003](0003-iframe-para-o-legado.md) | iframe com ponte `postMessage` para o legado | Convivência com o legado |
| [0004](0004-registro-de-jornadas-no-bff.md) | Registro de jornadas servido pelo BFF | Catálogo como dado, não código |
| [0005](0005-adotar-o-itau-design-system-como-l0.md) | Itaú Design System como camada L0 | Marca, tokens, alias semântico |
| [0006](0006-rspack-como-bundler.md) | Rspack como bundler, com MF nativo | Implementação da 0001; substitui Vite |
| [0007](0007-falha-de-render-atravessa-fronteira-de-raiz.md) | `ctx.fail` e o boundary que não atravessa raiz | Isolamento de falha real; contrato → 1.1 |
| [0008](0008-iconografia-por-nome-semantico.md) | Iconografia por nome semântico, tolerante | Ícone vindo de manifesto externo |
| [0009](0009-busca-global-agregada-no-bff.md) | Busca global agregada no BFF | Por que não há `registerSearchProvider` |
| [0010](0010-rollout-resolvido-tambem-no-cliente.md) | Rollout resolvido também no cliente | Kill switch local na falha do remote |

## Leitura sugerida

Para entender a arquitetura do zero: **0002** (o contrato) → **0001** (como a jornada
chega) → **0004** (como o shell descobre a jornada) → **0007** (o que acontece quando
quebra). As demais são decisões de apoio.

**0006** e **0007** são as duas que nasceram de problema encontrado em uso real, e não de
projeto no papel — são as mais úteis para julgar o rigor do resto.
