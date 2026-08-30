/**
 * Tela "Dependências de deploy": o que muda no pipeline quando o framework
 * muda. Conteúdo, não mecanismo -- a decisão inteira está em docs/adr/0012.
 */
import { Component, inject } from '@angular/core';
import { Shell } from './shell';

@Component({
  selector: 'pp-deploy',
  standalone: true,
  styles: [`
    .stack { display: flex; flex-direction: column; gap: var(--space-4); }
    .stack--tight { gap: var(--space-3); }
    .row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .num {
      font: var(--ts-display); color: var(--c-accent-text);
      font-variant-numeric: tabular-nums;
    }
    ol.steps { margin: 0; padding-left: var(--space-5); }
    .origem {
      font-family: var(--font-mono); font-size: 0.9em; word-break: break-all;
      background: var(--c-bg-sunken); border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4); color: var(--c-fg-default);
    }
    ol.passos { margin: 0; padding-left: var(--space-5); }
    ol.passos > li { margin-bottom: var(--space-4); }
    ol.passos > li:last-child { margin-bottom: 0; }
    ol.passos strong { display: block; margin-bottom: var(--space-1); }
    ol.steps li { font: var(--ts-body-sm); color: var(--c-fg-default); margin-bottom: var(--space-2); }
    ol.steps li:last-child { margin-bottom: 0; }
    code {
      font-family: var(--font-mono); font-size: 0.92em;
      background: var(--c-bg-sunken); border-radius: var(--radius-sm); padding: 1px 5px;
    }
  `],
  template: `
    <div class="stack">
      <button class="ds-btn ds-btn--ghost" style="align-self:flex-start"
              (click)="shell.ctx.navigate('/teste-angular')">
        ← Voltar para a prova
      </button>

      <!-- 0. Como esta página chegou até aqui -------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">Esta página foi publicada assim</h2>
        <p class="ds-card__hint">
          O que você está lendo é o artefato desta jornada, publicado sozinho — sem o shell,
          sem o BFF e sem as outras jornadas. Neste momento ele está sendo servido de:
        </p>
        <p class="origem" style="margin-top: var(--space-3)">{{ origem }}</p>
        <p class="ds-text ds-text--xs ds-text--subtle" style="margin-top: var(--space-2)">
          Esse endereço não está escrito em lugar nenhum do código: é o
          <code>__webpack_public_path__</code>, que o bundler resolve em runtime a partir do
          <code>src</code> do próprio script. Se este bundle for movido para outro CDN, a
          linha acima muda sozinha.
        </p>

        <ol class="passos" style="margin-top: var(--space-5)">
          @for (p of passos; track p.titulo) {
            <li>
              <strong class="ds-text ds-text--sm">{{ p.titulo }}</strong>
              <span class="ds-text ds-text--sm ds-text--muted" [innerHTML]="p.texto"></span>
            </li>
          }
        </ol>
      </section>

      <!-- 0b. O que foi verificado ------------------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">O que foi verificado, e não presumido</h2>
        <p class="ds-card__hint">
          Publicar não é o mesmo que funcionar. Cada linha abaixo foi conferida contra a URL
          pública, não contra o build local.
        </p>
        <div class="ds-table-wrap" style="margin-top: var(--space-4)">
          <table class="ds-table">
            <thead><tr><th>Verificação</th><th>Resultado</th></tr></thead>
            <tbody>
              @for (v of verificacoes; track v.o) {
                <tr><td>{{ v.o }}</td><td>{{ v.r }}</td></tr>
              }
            </tbody>
          </table>
        </div>

        <p class="ds-text ds-text--sm ds-text--muted" style="margin-top: var(--space-4)">
          <strong>Uma tentativa que não deu certo, e por que ficou de fora.</strong>
          Abrir uma rota interna desta jornada direto pela URL (fora do portal) devolve 404.
          A correção óbvia seria uma <em>rewrite</em> de SPA no provedor, mandando tudo para o
          index. Testado: fica pior. Como o publicPath é portátil, o HTML do harness referencia
          os assets de forma relativa, então a rewrite faz o browser pedir o script no caminho
          errado e a página abre <strong>em branco</strong> — sem erro visível. Um 404 honesto
          é melhor que uma tela branca, então o 404 ficou.
        </p>

        <p class="ds-text ds-text--sm ds-text--muted" style="margin-top: var(--space-4)">
          <strong>O que este exercício não cobre.</strong>
          Um deployment anônimo em provedor gratuito não tem prefixo por versão, autorização
          por squad no registro, log de auditoria nem promoção entre ambientes — tudo o que a
          seção seguinte descreve como necessário. Ele prova a mecânica: artefato portátil,
          CORS, federação cross-origin e troca de origem sem tocar no shell. Nada além disso.
        </p>
      </section>

      <!-- 1. O que NÃO muda ------------------------------------------------ -->
      <section class="ds-card">
        <h2 class="ds-card__title">O pipeline não muda</h2>
        <p class="ds-card__hint">
          Esta é a resposta curta, e ela é a que importa: o shell nunca soube em que
          framework a jornada foi escrita, então nada do que ele depende mudou.
        </p>
        <div class="ds-table-wrap" style="margin-top: var(--space-4)">
          <table class="ds-table">
            <thead>
              <tr><th>Etapa</th><th>Jornada React</th><th>Esta jornada</th></tr>
            </thead>
            <tbody>
              @for (r of iguais; track r.etapa) {
                <tr>
                  <td>{{ r.etapa }}</td>
                  <td>{{ r.react }}</td>
                  <td>{{ r.angular }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="ds-text ds-text--sm ds-text--muted" style="margin-top: var(--space-4)">
          Publicar uma versão desta jornada é o mesmo <code>PATCH</code> de sempre no
          registro do BFF: <code>version</code> e <code>entry</code>. Rollback é o
          <code>PATCH</code> de volta — o <code>registerRemotes(…, &#123; force: true &#125;)</code>
          do shell re-registra o mesmo container em outra URL sem recarregar a página.
        </p>
      </section>

      <!-- 2. O que muda ---------------------------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">O que muda — e o que eu faria com cada item</h2>
        <p class="ds-card__hint">Quatro pontos. Nenhum deles é bloqueante; três deles são recorrentes.</p>

        <div class="stack" style="margin-top: var(--space-4)">
          @for (d of diferencas; track d.titulo) {
            <div class="stack stack--tight"
                 style="border-left: 3px solid var(--c-border-default); padding-left: var(--space-4)">
              <div class="row">
                <span class="ds-badge" [class]="'ds-badge ds-badge--' + d.tom">{{ d.selo }}</span>
                <strong class="ds-text ds-text--sm">{{ d.titulo }}</strong>
              </div>
              <p class="ds-text ds-text--sm ds-text--muted">{{ d.problema }}</p>
              <p class="ds-text ds-text--sm"><strong>Decisão:</strong> {{ d.decisao }}</p>
            </div>
          }
        </div>
      </section>

      <!-- 3. O peso, medido ------------------------------------------------ -->
      <section class="ds-card">
        <h2 class="ds-card__title">O preço em bytes, medido e não estimado</h2>
        <p class="ds-card__hint">
          As jornadas React recebem React, o react-dom e o Design System do shell, via
          <code>shared</code> singleton. Esta não compartilha nada com ninguém.
        </p>
        <div class="row" style="gap: var(--space-6); margin-top: var(--space-4)">
          <div class="stack stack--tight">
            <span class="num">~294 KB</span>
            <span class="ds-text ds-text--xs ds-text--subtle">esta jornada — gzip, JIT incluído</span>
          </div>
          <div class="stack stack--tight">
            <span class="num">~37 KB</span>
            <span class="ds-text ds-text--xs ds-text--subtle">jornada holerite (React) — gzip</span>
          </div>
        </div>
        <p class="ds-text ds-text--sm ds-text--muted" style="margin-top: var(--space-4)">
          A diferença não é "Angular é pesado": é que <strong>o compilador do Angular
          viaja dentro do bundle</strong>. Este teste usa JIT — os templates são
          compilados no browser — porque é o que faz o Angular caber no mesmo Rspack
          das outras jornadas, sem um segundo pipeline. Com AOT, o compilador sai do
          bundle e a diferença encolhe para a ordem do runtime do framework.
          <strong>AOT seria requisito para ir a produção</strong>; para provar que a
          fronteira funciona, JIT é suficiente e muito mais barato de manter.
        </p>
      </section>

      <!-- 4. Checklist de admissão ----------------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">O que eu exigiria antes de aprovar em produção</h2>
        <p class="ds-card__hint">
          "Funciona" não é critério de admissão de framework. Isto é o que eu colocaria
          como porta de entrada — e o primeiro item é o único inegociável.
        </p>
        <ol class="steps" style="margin-top: var(--space-4)">
          @for (c of checklist; track c) { <li [innerHTML]="c"></li> }
        </ol>
      </section>

      <!-- 5. Quando eu diria não ------------------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">E quando eu diria não</h2>
        <p class="ds-text ds-text--sm ds-text--muted">
          A arquitetura <em>suportar</em> N frameworks não é razão para ter N frameworks.
          Cada um adiciona uma esteira de major, uma superfície de CVE, um conjunto de
          componentes de DS para reimplementar e um grupo de pessoas que não consegue
          revisar o código do outro. Eu aceitaria um segundo framework por um motivo de
          negócio — uma aquisição com time e produto prontos, um fornecedor que só entrega
          naquele stack, uma squad inteira que já é especialista — e nunca por preferência
          técnica. O valor deste teste é ter o custo medido <em>antes</em> de a conversa
          acontecer, não ter a porta aberta.
        </p>
      </section>
    </div>
  `
})
export class DeployScreen {
  readonly shell = inject(Shell);

  /**
   * A origem real deste bundle, resolvida pelo bundler em runtime. Roda igual
   * servida de localhost, de um preview de PR ou de um CDN de produção.
   */
  readonly origem = __webpack_public_path__ || '(origem não resolvida)';

  readonly passos = [
    {
      titulo: 'Build com endereço portátil',
      texto:
        'O <code>publicPath</code> desta jornada é <code>auto</code>, e não uma URL fixa como ' +
        'nas jornadas React: o bundler resolve o endereço dos chunks em runtime. Foi ' +
        'necessário, não elegante — o endereço de publicação só é conhecido DEPOIS do deploy, ' +
        'e não dá para embutir no bundle algo que ainda não existe. O efeito colateral é bom: ' +
        'os mesmos bytes servem de qualquer origem, sem rebuild por ambiente.'
    },
    {
      titulo: 'Cabeçalhos que a federação exige',
      texto:
        'Um <code>vercel.json</code> ao lado do bundle declara <code>Access-Control-Allow-Origin: *</code>, ' +
        'porque o portal baixa este script de outra origem, e cache imutável nos chunks com ' +
        'revalidação no <code>remoteEntry.js</code> — o artefato nunca muda para uma mesma URL, ' +
        'mas o ponto de entrada precisa poder ser trocado.'
    },
    {
      titulo: 'Publicação, num comando',
      texto:
        '<code>npm run deploy</code> builda, copia os artefatos para um diretório de deploy e ' +
        'envia. O diretório é separado do <code>dist</code> de propósito: o vínculo com o ' +
        'provedor mora nele, e o <code>dist</code> é apagado a cada build — sem essa separação, ' +
        'todo redeploy geraria uma URL nova e o rollback deixaria de existir.'
    },
    {
      titulo: 'Ativação: uma linha no registro',
      texto:
        'O campo <code>entry</code> desta jornada no registro do BFF passou a apontar para a ' +
        'URL publicada. O shell não foi reconstruído, não foi reiniciado e não teve uma linha ' +
        'alterada; o BFF relê o registro a cada requisição, e a jornada trocou de origem na ' +
        'carga de página seguinte. <strong>Publicar e ativar são dois atos separados</strong> — ' +
        'é isso que faz "deploy independente" ser literal em vez de retórico.'
    }
  ];

  readonly verificacoes = [
    { o: 'remoteEntry.js público, sem parede de autenticação', r: 'HTTP 200' },
    { o: 'Cabeçalho de CORS na resposta', r: 'Access-Control-Allow-Origin: *' },
    { o: 'Nome do container anunciado pelo bundle', r: 'teste_angular, derivado do id do manifesto' },
    { o: 'Smoke de federação contra a URL pública', r: 'contrato v1.1, montou e desmontou limpo' },
    { o: 'Portal carregando esta jornada', r: 'com o dev server da porta 5005 parado' },
    { o: 'Redeploy', r: 'mesma URL, artefato novo' }
  ];

  readonly iguais = [
    { etapa: 'Build', react: 'rspack build', angular: 'rspack build — mesmo preset' },
    { etapa: 'Artefato', react: 'remoteEntry.js + chunks', angular: 'idêntico' },
    { etapa: 'Publicação', react: 'CDN sob o prefixo da squad', angular: 'idêntico' },
    { etapa: 'Endereço', react: 'JOURNEY_PUBLIC_PATH no CI', angular: 'idêntico' },
    { etapa: 'Ativação', react: 'PATCH version/entry no registro', angular: 'idêntico' },
    { etapa: 'Rollout', react: 'percentage · allowlist · fallback', angular: 'idêntico' },
    { etapa: 'Rollback', react: 'PATCH de volta, sem rebuild do shell', angular: 'idêntico' },
    { etapa: 'Falha', react: 'timeout, boundary e tela degradada', angular: 'idêntico' },
    { etapa: 'Telemetria', react: 'tagueada por jornada/squad/versão', angular: 'idêntico' }
  ];

  readonly diferencas = [
    {
      selo: 'build',
      tom: 'accent',
      titulo: 'O runner de CI precisa de um segundo toolchain',
      problema:
        'O loader de TypeScript do Angular exige decorators legados e metadata — configuração ' +
        'incompatível com a das jornadas React na mesma passada de build.',
      decisao:
        'Virou angularJourneyConfig() dentro de @portal/build-preset, ao lado de journeyConfig(). ' +
        'O rspack.config.mjs da squad continua com quatro linhas e a lista de singletons segue ' +
        'tendo um dono só. Um segundo framework não pode virar um segundo pipeline: vira uma ' +
        'variante do caminho pavimentado, mantida por plataforma.'
    },
    {
      selo: 'bytes',
      tom: 'warn',
      titulo: 'Nada é compartilhado com o resto do portal',
      problema:
        'React, react-dom e o Design System chegam nas outras jornadas pelo shell. Esta não ' +
        'importa nenhum deles, e o Angular dela não serve para ninguém — então shared fica vazio ' +
        'e o framework inteiro viaja no bundle.',
      decisao:
        'Aceitar no teste e não antecipar. Um pacote entra em SHARED_SINGLETONS quando ganha o ' +
        'SEGUNDO consumidor — compartilhar com um só custa coordenação de versão entre squads ' +
        'e economiza zero byte. Se uma segunda jornada Angular aparecer, @angular/* entra na ' +
        'lista e as duas squads passam a subir de major juntas, que é exatamente o custo que as ' +
        'jornadas React já pagam hoje com o React.'
    },
    {
      selo: 'teste',
      tom: 'accent',
      titulo: 'O Vitest do repositório não cobre esta jornada',
      problema:
        'A suíte do portal é Vitest + jsdom + Testing Library, montada para React. Ela não ' +
        'compila componente Angular.',
      decisao:
        'A squad traz o próprio runner dentro do workspace dela — isso já é verdade para ' +
        'qualquer squad. O gate que a plataforma exige é outro, e é o mesmo para todo mundo: ' +
        'um smoke de federação no CI que baixa o artefato PUBLICADO, chama loadRemote(), e ' +
        'verifica contractVersion e typeof mount === "function". É esse teste que impede a ' +
        'classe de erro "publicou num formato que o portal não reconhece" (RUNTIME-002) de ' +
        'chegar ao colaborador — e ele é agnóstico de framework por construção.'
    },
    {
      selo: 'custo',
      tom: 'danger',
      titulo: 'Mais um framework é um custo recorrente, não de entrada',
      problema:
        'Uma segunda esteira de major, uma segunda superfície de CVE, uma segunda implementação ' +
        'de cada componente do Design System e um grupo de pessoas a menos capaz de revisar o ' +
        'código do outro.',
      decisao:
        'Dono nomeado para o upgrade e ADR com data de revisão — a decisão precisa poder ser ' +
        'reaberta. É o item que eu levaria para a conversa antes do item técnico.'
    }
  ];

  readonly checklist = [
    '<strong>Não pode patchear globais.</strong> Esta jornada é <em>zoneless</em>: ' +
      'não há zone.js. zone.js sobrescreve <code>setTimeout</code>, <code>Promise</code> e ' +
      '<code>addEventListener</code> no escopo global, que é compartilhado com o shell React, ' +
      'com as outras jornadas e com o iframe do legado. É o único item desta lista que eu ' +
      'trataria como inegociável — os outros são prazo, este é contaminação entre times.',
    '<strong>AOT no pipeline.</strong> Tirar o compilador JIT do bundle antes de qualquer ' +
      'tráfego real.',
    '<strong>Orçamento de bytes declarado no manifesto</strong> e verificado no CI, do mesmo ' +
      'jeito que <code>budget.loadTimeoutMs</code> já é.',
    '<strong>Smoke de federação obrigatório</strong> contra o artefato publicado, não contra o ' +
      'build local.',
    '<strong>Dono nomeado</strong> para a esteira de major do framework, com nome de pessoa e ' +
      'não de time.',
    '<strong>ADR com data de revisão</strong> — ver <code>docs/adr/0012</code>.'
  ];
}
