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
