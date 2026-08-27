# ADR 0008 — Iconografia por nome semântico, tolerante a nome desconhecido

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend + design
- **Relacionada:** [ADR 0004](0004-registro-de-jornadas-no-bff.md) (registro em runtime), [ADR 0005](0005-adotar-o-itau-design-system-como-l0.md) (IDS como L0)

## Contexto

O ícone de cada jornada no catálogo lateral vem do **manifesto**, que é dado servido pelo
BFF em runtime ([ADR 0004](0004-registro-de-jornadas-no-bff.md)). Ou seja: o valor do campo
`icon` é escrito por uma squad, num repositório que o time de plataforma não controla, e
chega ao shell **depois** que o shell foi publicado.

Isso cria duas perguntas que precisam ser respondidas juntas:

1. Como o ícone é desenhado — fonte de ícone do IDS, sprite SVG, ou SVG inline?
2. O que acontece quando uma jornada pede um ícone que este shell não conhece?

## Decisão

**1. Ícones são SVG inline, num único arquivo do DS** (`primitives/Icon.tsx`), endereçados
por **nome semântico** (`clock`, `bell`, `receipt`) — nunca por glifo, caractere ou URL.

O IDS tem a fonte proprietária *Itaú Icon*, que **não acompanha este repositório** — mesma
situação de *Itaú Display* e *Itaú Text* (ver "Pendências assumidas" da
[ADR 0005](0005-adotar-o-itau-design-system-como-l0.md)). Depender dela aqui deixaria o
menu do portal como uma fileira de quadradinhos fora da rede corporativa.

Adotar a fonte oficial mais tarde é **substituir esse arquivo**. Nenhum ponto de uso muda,
porque todos falam por nome.

**2. `icon` é `z.string()` no manifesto, e não um enum.**

Um enum obrigaria o conjunto de ícones do shell a ser um teto para o que as squads podem
publicar. Como o manifesto é validado em runtime, um nome fora do enum não faria o ícone
falhar — faria **o manifesto inteiro** falhar na validação, e a jornada sumiria do menu por
causa de um ícone.

**3. Nome desconhecido cai num fallback visível, nunca em erro.**

O `<Icon>` renderiza a marca crua do manifesto. O item continua clicável, a jornada
continua navegável, e o erro de registro fica visível para quem o mantém.

**4. A validação existe — no CI, não em produção.** O DS exporta `iconNames`, que alimenta
a checagem do registro na esteira. O erro custa um build, não um incidente.

## Consequências

**Positivas**
- Uma jornada publicada depois deste shell nunca some do menu por causa de iconografia.
- `stroke="currentColor"` faz o ícone herdar a cor do contexto: tema claro/escuro, estado
  ativo e barra de marca funcionam sem uma linha de CSS por caso.
- Sem FOUT e sem request extra — o SVG inline nasce com a página, ao contrário da fonte,
  que exibe o caractere cru enquanto carrega.
- Trocar para *Itaú Icon* tem raio de impacto de um arquivo.

**Negativas**
- **O conjunto de ícones vira responsabilidade de plataforma.** Squad que precisa de um
  ícone novo abre PR no DS. Mitigação: o fallback torna a espera não bloqueante — a jornada
  já vai para produção enquanto o PR anda.
- **Erro de digitação no registro não quebra nada em runtime**, e portanto pode passar
  despercebido. É exatamente por isso que a checagem por `iconNames` no CI não é opcional.
- Cada ícone adicionado pesa no bundle do DS. Aceitável na ordem de grandeza atual
  (~10 ícones); acima de ~50, reavaliar para sprite com `<use>`.

## Alternativas descartadas

| Opção | Por que não |
|---|---|
| **Fonte de ícone (*Itaú Icon*)** | Ativo proprietário fora do repositório; fora da rede o menu vira quadradinhos. É o destino, não o ponto de partida |
| **Enum no manifesto** | Transforma "ícone desconhecido" em "manifesto inválido". A jornada some do menu por causa de um campo cosmético |
| **A squad manda a URL do SVG** | Ativo de terceiro entrando no chrome do portal, sem revisão de marca e com request extra por item de menu |
| **Fallback silencioso (não desenhar nada)** | Esconde o erro de registro e desalinha o menu. O item ficaria clicável mas visualmente quebrado, sem ninguém saber por quê |
