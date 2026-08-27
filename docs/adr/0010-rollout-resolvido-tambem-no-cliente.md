# ADR 0010 — Rollout resolvido também no cliente, como kill switch local

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend
- **Relacionada:** [ADR 0004](0004-registro-de-jornadas-no-bff.md), [ADR 0001](0001-module-federation-com-remotes-em-runtime.md)

## Contexto

O manifesto carrega `rollout` (`enabled`, `percentage`, `allowlist`, `fallbackJourneyId`).
O BFF já poda o catálogo por papel antes de responder ([ADR 0004](0004-registro-de-jornadas-no-bff.md)),
então a leitura natural é que a decisão de rollout também deveria ser só do servidor — o
cliente receberia o manifesto já resolvido e não teria escolha a fazer.

## Decisão

O cálculo de bucket roda **também no cliente** (`@portal/platform-core/rollout.ts`), a
partir dos campos que já vêm no manifesto.

O hash é estável (FNV-1a sobre `userId:journeyId`): o mesmo colaborador cai sempre no mesmo
bucket, então a experiência não oscila entre recarregamentos.

O motivo de duplicar aqui não é desconfiança do BFF — é que o **mesmo cálculo serve de kill
switch local quando o remote falha em runtime**. A [ADR 0001](0001-module-federation-com-remotes-em-runtime.md)
aceitou que "falha de rede vira falha de tela"; com o rollout resolvido no cliente, o
`JourneyHost` já tem em mãos, no momento da falha, qual é a jornada equivalente para onde
degradar — sem uma segunda ida ao servidor, que é justamente o que pode estar indisponível.

A decisão acontece **antes de qualquer download de bundle**.

## Consequências

**Positivas**
- Degradação para a versão anterior não depende de uma requisição que pode falhar pelo
  mesmo motivo que derrubou a jornada.
- Rollout é auditável no cliente: o painel de telemetria mostra bucket e motivo
  (`allowlist` | `rollout` | `fora-do-rollout`), o que torna "por que eu vejo a versão
  antiga?" uma pergunta respondível em suporte.
- Reduzir `percentage` no registro tem efeito no próximo carregamento, sem deploy.

**Negativas**
- **Duas implementações do mesmo cálculo** (BFF e cliente) que precisam concordar. Se
  divergirem, o colaborador vê um catálogo e recebe outro comportamento. Mitigação: o
  algoritmo é fechado e trivial (FNV-1a, 15 linhas), com o mesmo vetor de teste dos dois
  lados. Se crescer, vira pacote compartilhado.
- **`percentage` e `allowlist` ficam visíveis no cliente.** São dados de rollout interno,
  não segredo — mas é preciso deixar explícito que **não são controle de acesso**. A poda
  por papel continua sendo do servidor, e o BFF nunca envia manifesto que o colaborador não
  pode usar.

## Alternativas descartadas

| Opção | Por que não |
|---|---|
| **Só no BFF** | No momento em que o remote falha, resolver o fallback exigiria nova chamada ao servidor — possivelmente indisponível pelo mesmo motivo |
| **Só no cliente** | O catálogo trafegaria jornadas que o colaborador não pode ver. Controle de acesso não desce para o cliente |
| **Flag por usuário em vez de bucket** | Exige armazenar decisão por colaborador × jornada. Hash estável dá a mesma propriedade sem estado |
