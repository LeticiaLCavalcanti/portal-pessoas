# ADR 0001 — Module Federation com remotes resolvidos em runtime

- **Status:** aceito
- **Data:** 2026-08
- **Decisores:** plataforma frontend

## Contexto
10+ squads precisam publicar jornadas de forma independente. Qualquer solução que exija
build ou deploy do shell para publicar uma jornada transforma o shell em fila única.

## Decisão
Usar Module Federation, mas **sem declarar remotes em tempo de build**. O shell registra
os remotes em runtime, com as URLs vindas do registro servido pelo BFF.

Em código, isto é `apps/shell/src/platform/loadRemote.ts` — o único arquivo do shell que
conhece Module Federation:

```ts
registerRemotes([{ name: container, entry: manifest.entry, type: 'global' }], { force: true });
const mod = await loadRemote(`${container}/journey`);
```

`force: true` é o que torna rollback instantâneo: re-registrar o mesmo container apontando
para outra URL basta para o colaborador passar a baixar outro bundle no próximo carregamento.

A *implementação* desse modelo (qual bundler, qual runtime) é assunto da
[ADR 0006](0006-rspack-como-bundler.md), que trocou Vite por Rspack sem alterar nada aqui.

## Consequências
**Positivas**
- Publicar jornada = alterar um registro. Zero mudança no core.
- Reverter = alterar um número. Sem rebuild.
- Dependências compartilhadas (`react`, `react-dom`, DS) como singleton — verificável: com
  duas jornadas montadas, o browser carrega **uma** instância de React 18.3.1.

**Negativas**
- Falha de rede vira falha de tela → exige timeout, retry, fallback e error boundary por
  jornada (implementados em `JourneyHost`). Falha de *render* dentro da jornada é um caso
  à parte, tratado na [ADR 0007](0007-falha-de-render-atravessa-fronteira-de-raiz.md).
- Depurar produção exige source maps por versão e disciplina de observabilidade.
- Divergência de versão nos `shared` quebra hooks → lista `shared` curta, declarada num só
  lugar (`@portal/build-preset`) e governada por Renovate.
- **O erro do runtime de federação é técnico demais para a tela.** Mensagens como
  `#RUNTIME-008 ... View the docs` são para quem mantém o portal. O shell traduz para uma
  frase de colaborador e manda a original, inteira, para a telemetria.

## Alternativas descartadas
Pacotes npm versionados (shell vira gargalo), single-spa (resolve orquestração mas não
compartilhamento), Web Components (Shadow DOM briga com o DS), iframes para tudo (UX ruim).
