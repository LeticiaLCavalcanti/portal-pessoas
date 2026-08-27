# ADR 0005 — Adotar o Itaú Design System (IDS) como camada L0

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend + design

## Contexto
O Portal Pessoas é um produto interno. Produtos internos costumam justificar uma
identidade própria ("não é cliente que vê") e, em dois anos, a empresa passa a ter duas
identidades Itaú divergindo em silêncio. O IDS já resolve marca, acessibilidade,
tipografia e paridade entre web e mobile.

## Decisão
1. O IDS é a camada L0. O portal **não** define cor, espaçamento nem tipografia própria.
2. Entre o IDS e os componentes existe uma camada fina de **alias semântico**
   (`@portal/tokens`): `ids_color_bg_base` → `c-bg-surface`.
3. Tudo que o portal precisar e o IDS não cobrir fica isolado em um bloco `extras`
   visível, com dono e prazo, e vira RFC para o time de Design System.

## Consequências
**Positivas**
- O CSS gerado não contém valor de cor, só `var(--ids_*)`. Versão nova do IDS chega ao
  portal e a todos os microfrontends **sem rebuild de nenhuma jornada**.
- Uma major do IDS tem raio de impacto de um arquivo, não de 10 repositórios.
- As exceções ficam contáveis e auditáveis em vez de espalhadas.

**Negativas**
- Uma indireção a mais para depurar no DevTools (`--c-accent-bg` → `--ids_color_action_primary_base` → `#FF6200`).
- O portal fica dependente da cadência do time de DS para o que falta. Mitigação: o bloco
  `extras` é a válvula de escape, com a regra de que todo item ali tem RFC aberta.

**Pendências assumidas**
- As fontes proprietárias não acompanham o repositório; há fallback de sistema com as
  mesmas métricas, então o layout não muda ao adicionar o `@import` oficial.
- O tema escuro é aproximação derivada do azul de marca, isolada em `darkOverrides`, até
  consumirmos o tema oficial distribuído por classe `ids-theme-*`.
