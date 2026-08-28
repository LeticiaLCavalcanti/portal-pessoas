# ADR 0011 — DS v2 no mesmo pacote da v1, com namespace de CSS disjunto

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend + design
- **Relacionada:** [ADR 0005](0005-adotar-o-itau-design-system-como-l0.md) (IDS como L0),
  [ADR 0001](0001-module-federation-com-remotes-em-runtime.md) (singletons federados)

## Contexto

O `@portal/design-system` acumulou duas decisões de API que envelheceram mal:

1. `Button.variant` misturava **ênfase** (preenchido, contornado, sem fundo) com
   **intenção** (marca, neutro, destrutivo). Botão de ação destrutiva era
   impossível de expressar, e acrescentar `variant="danger"` duplicaria as três
   variantes existentes vezes cada intenção nova.
2. `DataList` desenhava par rótulo/valor como `<ul>/<li>`, o que não é a estrutura
   de uma lista de definição e já tinha custado um bug de aninhamento de DOM
   remediado com `as="div"`.

Corrigir as duas quebra ponto de uso. E é aqui que a decisão real aparece: o
portal tem **10 squads com repositórios e cadências próprias**. Uma major que
exija find/replace atômico em todos os repositórios no mesmo sprint não é uma
major — é um congelamento do produto inteiro por um refactor de plataforma. A
[proposta técnica](../01-proposta-tecnica.md#versionamento-e-governança) já
assumia suporte N-1; esta ADR é a primeira vez que isso é exercido, e define
**como** a convivência funciona na prática.

## Decisão

**A v2 é publicada como subpath do mesmo pacote, com namespace de CSS disjunto e
ponte de props no runtime.** Quatro partes:

1. **Mesmo pacote, subpath `/v2`.** `@portal/design-system` continua sendo a v1;
   `@portal/design-system/v2` é a v2. Sai como **minor** (`1.1.0`), porque a v1
   não perdeu nada.
2. **Prefixo de classe `ds2-`, disjunto de `ds-`.** As duas folhas coexistem no
   mesmo documento; nenhum seletor de uma alcança um nó da outra. A folha da v1
   importa a da v2, então quem já carrega o CSS do DS não muda nada.
3. **Ponte de props.** A v2 aceita os valores da v1 (`variant="primary"`,
   `tone="warn"`), traduz e emite aviso de depreciação **uma vez por chave, só em
   desenvolvimento**. Trocar o import é, sozinho, uma mudança sem efeito.
4. **`/v2` reexporta a v1 no que ainda não tem v2.** A superfície `/v2` é sempre
   a superfície completa do DS.

A unidade de migração é o **arquivo**, não o repositório e nem a jornada.

## Alternativas descartadas

**Pacote novo, `@portal/design-system-v2`.** Descartada pelo Module Federation:
`@portal/design-system` é singleton compartilhado entre shell e as 10 jornadas.
Um segundo pacote seria um **segundo singleton** para as 10 squads negociarem, e
uma página com uma jornada em v1 e outra em v2 baixaria dois pacotes de DS. No
mesmo pacote, a página carrega uma cópia só, que contém as duas versões.

> Consequência operacional que isso trouxe: a chave `'@portal/design-system'` do
> `SHARED_SINGLETONS` compartilha exatamente esse especificador — deep import não
> casa com ela. Foi preciso acrescentar `'@portal/design-system/'` (sharing por
> prefixo), senão cada jornada que migrasse embutiria a própria cópia da v2 e o
> singleton deixaria de ser um. Verificável no `remoteEntry.js` da jornada.

**Major limpa (`2.0.0`) com codemod.** É o caminho de um repositório só. Com 10
repositórios, o codemod não resolve o problema que importa: ele muda o código, mas
não muda o fato de que 10 squads precisariam **mergear, testar e publicar** no
mesmo intervalo. A v2 vira refém da squad mais ocupada.

**Flag de tema/compat em runtime (`<DSProvider version="2">`).** Descartada por
mover a decisão de versão para a árvore React: o comportamento de um componente
passaria a depender de quem o renderiza, o que atravessa a fronteira de Module
Federation da pior maneira possível — a jornada não controla o provider do shell.
Import estático é resolvido em build, é grepável e não tem estado.

**Reescrever a v1 no lugar (`ds-btn` ganha as props novas).** Tentador, e é o que
parece "menos trabalho". Quebra silenciosamente: qualquer squad com override de
`.ds-btn` no CSS próprio muda de aparência sem nenhum sinal, e sem PR nenhum no
repositório dela.

## Consequências

**Positivas**
- Migrar é trocar uma linha de import, em um arquivo, sem coordenar com ninguém.
- Nenhuma jornada precisa de rebuild para o portal seguir funcionando: a v2 é
  minor e `requiredVersion: '^1.0.0'` continua satisfeito.
- Como as duas versões leem os mesmos tokens L0, uma tela migrada e uma não
  migrada são indistinguíveis — o portal não fica com duas caras durante a
  transição.
- Os avisos de depreciação tornam o débito **contável**: enquanto aparecerem no
  console de alguma squad, a v1 não sai.

**Negativas**
- Duas implementações de `Button`, `Badge`, `Card` e `DataList` no mesmo pacote
  enquanto a migração durar. É custo de manutenção real, e a mitigação é o prazo
  da v3, não a esperança de que alguém migre por conta.
- Alguns kB de CSS não usado em toda página, porque a folha da v1 carrega a da
  v2. Pagamos isso para que uma jornada nunca dependa de um deploy do shell para
  trocar um botão.
- A ponte de props é código que existe só para ser apagado. Se a v3 nascer sem
  apagá-la, a decisão terá falhado.

**Pendências assumidas**
- `Badge` não tem variante preenchida na v2: o recorte de alias só expõe o par
  *soft* dos tokens de feedback, e `--c-warn-text` é `#000000` (a cor do texto
  *sobre* o alerta, não a do alerta). Preencher isso exigiria escolher cor no DS
  do portal, o que a ADR 0005 proíbe. **RFC ao time do IDS** pedindo o par forte
  dos tokens de feedback.
- `Tabs`, `Field`, `EmptyState` e `Brand` ainda não têm v2 e são reexportados da
  v1. Não há problema conhecido neles; entram quando houver motivo, não por
  simetria.
