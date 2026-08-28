# Migração v1 → v2 do `@portal/design-system`

> **Resumo:** trocar `'@portal/design-system'` por `'@portal/design-system/v2'` em
> **um** arquivo. Nada mais precisa mudar no mesmo PR. As props da v1 continuam
> compilando e funcionando, com aviso de depreciação no console de dev.

Contexto e alternativas descartadas: [ADR 0011](../../docs/adr/0011-design-system-v2-conviver-com-a-v1.md).

---

## 1. Por que dá para migrar aos poucos

Três decisões, e cada uma remove um motivo de "big bang":

| Decisão | O que ela impede |
|---|---|
| **Mesmo pacote, subpath `/v2`** | Um segundo singleton de DS no Module Federation, e duas cópias do DS na mesma página quando uma jornada está em v1 e outra em v2. |
| **Prefixo CSS `ds2-`, disjunto de `ds-`** | Cascata cruzada. Um `<Card>` v1 pode conter um `<Button>` v2 no mesmo nó, sem override e sem `!important`. |
| **Ponte de props no runtime** | Que "migrar" seja um find/replace atômico em N arquivos. O import muda hoje; as props mudam quando a squad quiser. |

A v2 saiu como **minor** (`1.0.0` → `1.1.0`): a v1 não perdeu nada. O
`requiredVersion: '^1.0.0'` do `build-preset` continua satisfeito, então
**nenhuma jornada precisa de rebuild** para o portal seguir funcionando.

**A aparência não muda.** As duas versões leem os mesmos tokens L0 do IDS, com as
mesmas medidas. Um `Badge` v1 e um `Badge` v2 lado a lado são indistinguíveis —
requisito, não coincidência: é o que permite migrar uma tela por vez sem que o
portal fique com duas caras durante a transição.

---

## 2. Estado da superfície

| Componente | Situação em `/v2` | Quebra? |
|---|---|---|
| `Button` | v2 | **sim** — `variant` fatiado em `variant` + `tone` |
| `Badge` | v2 | **sim** — tons renomeados |
| `DataList` | v2 | **sim** — `<ul>` → `<dl>`, ganha `emphasis` e `hint` |
| `Card` | v2 | não — mesmas props, mais `elevation` e `density` |
| `Stack` `Row` `Text` `Skeleton` `Field` `EmptyState` `ErrorBoundary` `Icon` `Brand` `Tabs` | reexportados da v1, sem alteração | não |

`/v2` é sempre a superfície **completa** do DS. O que ainda não tem v2 vem da v1
pelo mesmo import, então a squad não precisa saber de cor o que já migrou —
conhecimento que não está no código e que envelhece a cada release.

---

## 3. As três quebras, e o que fazer

### `Button` — ênfase e intenção viraram props separadas

Na v1, `variant` misturava as duas coisas. Consequência prática: **botão de ação
destrutiva era impossível de expressar**, e criar `variant="danger"` duplicaria as
três variantes existentes vezes cada intenção nova.

```diff
- <Button variant="primary">Salvar</Button>
+ <Button>Salvar</Button>                                  {/* solid + accent é o padrão */}

- <Button variant="secondary">Informe de rendimentos</Button>
+ <Button variant="outline">Informe de rendimentos</Button>

- <Button variant="ghost">← Voltar</Button>
+ <Button variant="ghost">← Voltar</Button>                {/* sem mudança */}

  {/* o que a v1 não conseguia dizer: */}
+ <Button variant="outline" tone="critical">Cancelar solicitação</Button>
```

`variant="primary"` e `variant="secondary"` **continuam funcionando** — são
traduzidos e avisam uma vez no console de dev.

**Novo:** `loading`, `size`, `iconStart`, `iconEnd`, `fullWidth`.

`loading` substitui o padrão de trocar o rótulo na mão:

```diff
- <Button disabled={baixando} onClick={baixar}>
-   {baixando ? 'Gerando…' : 'Baixar demonstrativo'}
- </Button>
+ <Button loading={baixando} onClick={baixar}>
+   Baixar demonstrativo
+ </Button>
```

Não é açúcar sintático: texto que muda dentro de um botão **não é região viva**,
então o leitor de tela não anunciava nada. `loading` põe `aria-busy` no nó certo,
mantém o rótulo (logo, a largura do botão não muda no meio do clique) e desenha o
indicador visual.

### `Badge` — tons com nome semântico

```diff
- <Badge tone="warn">pendente</Badge>
+ <Badge tone="warning">pendente</Badge>

- <Badge tone="danger">recusado</Badge>
+ <Badge tone="critical">recusado</Badge>

- <Badge>rascunho</Badge>
+ <Badge tone="neutral">rascunho</Badge>          {/* default invisível virou nome */}
```

`warn` e `danger` continuam funcionando, com aviso. `success` e `accent` não
mudaram; `info` passou a existir.

> **Lacuna assumida:** a v2 **não** tem `variant="solid"` no Badge. O recorte de
> alias do portal só expõe o par *soft* dos tokens de feedback — `--c-warn-text` é
> `ids_color_feedback_alert_contrast`, ou seja `#000000`, a cor do texto *sobre* o
> alerta e não a cor do alerta. Usá-lo como fundo desenharia um selo de aviso
> preto, e no tema escuro `info` ficaria ilegível. Preencher isso exigiria
> escolher cores no DS do portal, que é o que a [ADR 0005](../../docs/adr/0005-adotar-o-itau-design-system-como-l0.md)
> proíbe. O caminho é RFC ao time do IDS pedindo o par forte dos tokens de
> feedback.

### `DataList` — `<dl>` no lugar de `<ul>`

```diff
  <DataList items={[
    { label: 'Total de proventos', value: d.bruto },
-   { label: 'Líquido a receber', value: <Text size="lg">{d.liquido}</Text> }
+   { label: 'Líquido a receber', value: d.liquido, emphasis: true }
  ]} />
```

Dois ganhos:

- **Acessibilidade.** `<dt>`/`<dd>` fazem o leitor de tela anunciar o par
  ("Líquido a receber, R$ 8.412,90") em vez de duas cadeias soltas dentro do
  mesmo item de lista.
- **Estrutura.** `<dd>` é container de conteúdo de fluxo, então `value` pode ser
  um Badge, um botão ou uma `Row` sem que o navegador reorganize a árvore. A v1
  emitia `<p>` para o valor e precisava de `as="div"` como remédio; aqui o
  problema deixa de existir.

`emphasis` tira do ponto de uso a decisão de como um total se parece. Antes, cada
tela do portal inventava a sua.

**Novo:** `hint` por item, para texto auxiliar sob o rótulo.

---

## 4. Precisa dos dois no mesmo arquivo?

```tsx
import { Button, v1 } from '@portal/design-system/v2';

<Button>novo</Button>
<v1.Button variant="primary">antigo</v1.Button>
```

Existe explicitamente para que o uso apareça no grep de adoção do DS — melhor do
que a squad descobrir sozinha que pode importar dos dois caminhos.

---

## 5. CSS: nada a fazer

A folha da v1 (`@portal/design-system/styles.css`) já importa a da v2. Quem
carrega o CSS do DS hoje são o shell e o harness `standalone` de cada squad — se
a v2 exigisse um import a mais, um componente v2 dentro de uma jornada federada
renderizaria **sem estilo** no portal, porque quem carrega a folha é o host, e o
host não sabe o que a jornada usa por dentro. Uma jornada não pode depender de um
deploy do shell para trocar um botão.

Custo: alguns kB de CSS não usado enquanto a migração não termina.

---

## 6. Exemplo real no repositório

`apps/journey-holerite` está **parcialmente** migrada, de propósito:

- `src/Detail.tsx` — v2, um único import de DS.
- `src/journey.tsx` (`Screen`, `IncomeStatement`) — v1, intocado.

As duas telas renderizam na mesma árvore React, sob o mesmo `ErrorBoundary`,
dentro do mesmo shell. `Detail.tsx` usa `Icon` (primitivo v1) dentro de `Button`
(primitivo v2) no mesmo nó, e a classe `ds-grid` da v1 continua valendo lá.

---

## 7. Prazo

| Quando | O quê |
|---|---|
| `1.1.0` (agora) | v2 disponível; v1 intacta; ponte de props ativa com aviso em dev. |
| durante o suporte N-1 | Squads migram no próprio ritmo. Nenhuma migração é bloqueante. |
| `2.0.0` | v1 sai do pacote e `/v2` passa a ser a raiz. A ponte de props sai junto. |

A regra de suporte N-1 já estava assumida em
[docs/01-proposta-tecnica.md](../../docs/01-proposta-tecnica.md#versionamento-e-governança);
a v2 é a primeira vez que ela é exercida.

**Os avisos de depreciação são a métrica.** Enquanto aparecerem no console de
alguma squad, a v1 não sai. Sem eles, a ponte vira permanente e a v3 nasce
carregando a v1 nas costas.
