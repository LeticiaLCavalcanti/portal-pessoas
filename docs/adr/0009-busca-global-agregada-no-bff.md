# ADR 0009 — Busca global agregada no BFF, sem provider em runtime

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend + produto
- **Relacionada:** [ADR 0002](0002-contrato-agnostico-de-framework.md) (contrato mínimo), [ADR 0004](0004-registro-de-jornadas-no-bff.md)

## Contexto

O colaborador não sabe — nem deveria saber — em qual squad mora "informe de rendimentos".
A busca precisa ser **do portal**, não uma busca por jornada.

O desenho intuitivo seria acrescentar ao `JourneyContext` algo como
`registerSearchProvider(fn)`: cada jornada registra como buscar dentro de si, o shell faz
fan-out entre os providers registrados.

Esse desenho tem um defeito fatal: **só existe provider de jornada montada**. Para o
colaborador digitar na busca e ver resultados de benefícios sem ter aberto benefícios, o
shell precisaria carregar os 10 microfrontends no boot — destruindo exatamente a
propriedade de carregamento sob demanda que a [ADR 0001](0001-module-federation-com-remotes-em-runtime.md)
existe para garantir.

## Decisão

**A indexação acontece no servidor.** Cada squad publica seu índice; o BFF faz o fan-out e
expõe `GET /v1/search?q=`. O shell consome um endpoint e renderiza.

O manifesto declara a participação via `capabilities: ['search']` — é dado, não código.
**Não há `registerSearchProvider` no contrato**, e essa ausência é deliberada.

O resultado navega para uma rota **interna** da jornada (`/ponto/espelho`). O shell garante
a rota; reconhecê-la é responsabilidade da jornada dona, via `ctx.path`.

## Consequências

**Positivas**
- Busca responde sem carregar nenhuma jornada. O custo é uma requisição, não 10 bundles.
- O contrato de front continua pequeno, que é o compromisso da [ADR 0002](0002-contrato-agnostico-de-framework.md).
- Índice no servidor permite ranking, sinônimos e correção de digitação — coisas que não se
  fazem bem no cliente e que nenhuma squad deveria implementar dez vezes.
- Uma jornada legada (que não roda JS do portal) participa da busca em pé de igualdade.

**Negativas**
- **A squad passa a ter uma obrigação de backend** (publicar índice) para aparecer na busca.
  É mais trabalho do que registrar uma função.
- **O índice pode ficar velho** em relação ao estado real da jornada. Aceito: os alvos são
  entidades estáveis (telas, documentos, benefícios), não dados transacionais.
- **Rota interna sem dono visível.** Se a jornada não reconhece `ctx.path`, o clique navega
  e não acontece nada. Foi um bug real em ponto e benefícios. Mitigação: o `ctx.path` está
  no contrato desde 1.0 e o template de jornada já trata a rota profunda.

## Alternativas descartadas

| Opção | Por que não |
|---|---|
| **`registerSearchProvider` no contrato** | Só há provider de jornada montada. Buscar exigiria carregar as 10 jornadas no boot |
| **Índice pré-carregado no shell** | O shell passaria a conhecer o conteúdo das jornadas — o acoplamento que toda esta arquitetura evita |
| **Busca por jornada, sem busca global** | Empurra para o colaborador a pergunta "de quem é isso?", que é justamente o que o portal deveria responder |
