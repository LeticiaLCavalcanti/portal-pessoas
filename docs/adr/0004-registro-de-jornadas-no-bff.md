# ADR 0004 — Registro de jornadas servido pelo BFF

- **Status:** aceito
- **Data:** 2026-08

## Contexto
"Inclusão de novas jornadas sem alterar o core" só é verdade se o core não tiver
conhecimento estático das jornadas.

## Decisão
O BFF expõe `GET /v1/journeys` com os manifestos visíveis para o colaborador autenticado.
O shell valida cada manifesto com Zod antes de transformá-lo em rota.

## Consequências
**Positivas**
- Catálogo, menu, rotas e rollout são dados, não código.
- Poda por papel acontece no servidor; o cliente nunca recebe manifesto que não pode usar.
- Manifesto inválido derruba apenas a própria jornada e gera alerta para o time dono.

**Negativas**
- O registro vira um ponto crítico: precisa de cache, de resposta em stale-while-revalidate
  e de um snapshot embutido no shell como último recurso.
- Governança do registro precisa de CI próprio (rota única, SemVer válido, entry acessível).
