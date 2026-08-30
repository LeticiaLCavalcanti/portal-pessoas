/**
 * Tela de prova: o contrato exercitado item por item.
 *
 * Separado do `app.ts` porque `imports` de componente standalone é avaliado
 * quando a classe é definida -- duas classes no mesmo arquivo, uma importando a
 * outra que vem abaixo, cai em temporal dead zone, e só quebra em runtime.
 */
import { Component, VERSION, inject, signal } from '@angular/core';
import { Shell } from './shell';

@Component({
  selector: 'pp-prova',
  standalone: true,
  styles: [`
    .stack { display: flex; flex-direction: column; gap: var(--space-4); }
    .stack--tight { gap: var(--space-2); }
    .row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .aviso {
      border-left: 4px solid var(--c-accent-bg);
      background: var(--c-bg-sunken);
      border-radius: var(--radius-md);
      padding: var(--space-4) var(--space-5);
    }
    .prova {
      display: grid; gap: var(--space-3) var(--space-4);
      grid-template-columns: minmax(0, 1fr);
    }
    @media (min-width: 720px) { .prova { grid-template-columns: 190px minmax(0, 1fr) auto; align-items: center; } }
    /* Sem isto os botões esticariam até a largura do mais largo da coluna. */
    .prova > .ds-btn { justify-self: end; }
    .prova > .sep { grid-column: 1 / -1; height: 1px; background: var(--c-border-default); }
    .contador { font: var(--ts-display); font-variant-numeric: tabular-nums; color: var(--c-accent-text); }
    code {
      font-family: var(--font-mono); font-size: 0.92em;
      background: var(--c-bg-sunken); border-radius: var(--radius-sm); padding: 1px 5px;
    }
  `],
  template: `
    <div class="stack">
      <div class="aviso">
        <p class="ds-text ds-text--sm">
          <strong>Isto é um teste, não uma jornada de produto.</strong>
          Ele existe para responder a uma pergunta só: acoplar um microfrontend escrito em
          <strong>outro framework</strong> funciona igual? Tudo abaixo é Angular
          {{ versaoAngular }} rodando dentro de um shell React, carregado pelo mesmo Module
          Federation, pelo mesmo registro do BFF e pelo mesmo contrato v1.1 das outras
          jornadas. Nenhum arquivo de <code>apps/shell</code> foi alterado para ele existir.
        </p>
      </div>

      <!-- Prova de vida do framework -------------------------------------- -->
      <section class="ds-card">
        <div class="row" style="justify-content: space-between; align-items: flex-start">
          <div>
            <h2 class="ds-card__title">Prova de vida</h2>
            <p class="ds-card__hint">
              O contador é um <code>signal</code> do Angular, e a jornada roda
              <em>zoneless</em> — sem zone.js na página.
            </p>
          </div>
          <span class="ds-badge ds-badge--success">Angular {{ versaoAngular }}</span>
        </div>

        <div class="row" style="margin-top: var(--space-5)">
          <span class="contador">{{ cliques() }}</span>
          <button class="ds-btn ds-btn--primary" (click)="cliques.set(cliques() + 1)">
            Somar um
          </button>
          <button class="ds-btn ds-btn--ghost" (click)="cliques.set(0)">Zerar</button>
        </div>

        <p class="ds-text ds-text--sm ds-text--muted" style="margin-top: var(--space-4)">
          Este número repinta pela detecção de mudança do Angular. O React do shell não
          re-renderiza nada — as duas árvores convivem na mesma página sem se conhecer, cada
          uma dona do seu pedaço de DOM.
        </p>
      </section>

      <!-- O contrato, item por item --------------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">O contrato v1.1, exercitado item por item</h2>
        <p class="ds-card__hint">
          Cada linha é um membro do <code>JourneyContext</code>. Se algo do acoplamento não
          atravessasse a fronteira de framework, seria aqui que apareceria.
        </p>

        <div class="prova" style="margin-top: var(--space-5)">
          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.user</span>
          <span class="ds-text ds-text--sm">
            Sessão resolvida pelo shell: <strong>{{ shell.ctx.user.name }}</strong>,
            matrícula {{ shell.ctx.user.registration }}. A jornada nunca fez login.
          </span>
          <span></span>
          <div class="sep"></div>

          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.http</span>
          <span class="ds-text ds-text--sm">{{ estadoHttp() }}</span>
          <button class="ds-btn ds-btn--secondary" (click)="chamarBff()">GET /v1/journeys</button>
          <div class="sep"></div>

          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.theme</span>
          <span class="ds-text ds-text--sm">
            Tema atual: <strong>{{ shell.theme() }}</strong>. Troque no topo do portal — o
            callback do shell escreve num signal e a tela repinta sozinha.
          </span>
          <span></span>
          <div class="sep"></div>

          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.navigate</span>
          <span class="ds-text ds-text--sm">
            Rota interna atual: <code>{{ shell.path() }}</code>. A URL do browser é do shell;
            a jornada só pede a navegação.
          </span>
          <button class="ds-btn ds-btn--primary"
                  (click)="shell.ctx.navigate('/teste-angular/deploy')">
            Dependências de deploy →
          </button>
          <div class="sep"></div>

          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.notify</span>
          <span class="ds-text ds-text--sm">
            O toast é renderizado pelo shell, em React. Consistência de UX sem componente
            compartilhado.
          </span>
          <button class="ds-btn ds-btn--secondary"
                  (click)="shell.ctx.notify('Toast do shell, disparado por código Angular.', 'success')">
            Disparar toast
          </button>
          <div class="sep"></div>

          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.telemetry</span>
          <span class="ds-text ds-text--sm">
            Evento já tagueado com jornada, squad e versão — aparece no painel de telemetria
            do portal.
          </span>
          <button class="ds-btn ds-btn--secondary" (click)="emitirEvento()">Emitir evento</button>
          <div class="sep"></div>

          <span class="ds-text ds-text--sm ds-text--mono ds-text--subtle">ctx.fail</span>
          <span class="ds-text ds-text--sm">
            Falha irrecuperável reportada pela jornada. O shell troca por uma tela degradada
            com código de rastreio, e o resto do portal continua de pé (docs/adr/0007).
          </span>
          <button class="ds-btn ds-btn--ghost" (click)="derrubarDeProposito()">
            Derrubar de propósito
          </button>
        </div>
      </section>

      <!-- O que não atravessou -------------------------------------------- -->
      <section class="ds-card">
        <h2 class="ds-card__title">O que não atravessou a fronteira — e por quê</h2>
        <p class="ds-card__hint">
          O resultado mais útil do teste não é o que funcionou. É a linha exata onde o
          Design System deixa de ser compartilhável.
        </p>
        <div class="stack" style="margin-top: var(--space-4)">
          <div class="stack stack--tight">
            <div class="row">
              <span class="ds-badge ds-badge--success">atravessa</span>
              <strong class="ds-text ds-text--sm">Tokens e a camada CSS do DS</strong>
            </div>
            <p class="ds-text ds-text--sm ds-text--muted">
              Esta tela usa <code>ds-card</code>, <code>ds-btn</code>, <code>ds-badge</code>,
              <code>ds-table</code> e as custom properties <code>--c-*</code> e
              <code>--space-*</code> — os mesmos nomes que o shell React usa. É por isso que
              ela é indistinguível das outras jornadas, inclusive no tema escuro. Essas
              classes são publicadas sem hash de propósito, e este teste é a razão declarada
              disso em <code>@portal/build-preset</code>.
            </p>
          </div>
          <div class="stack stack--tight">
            <div class="row">
              <span class="ds-badge ds-badge--warn">não atravessa</span>
              <strong class="ds-text ds-text--sm">Os componentes React do DS</strong>
            </div>
            <p class="ds-text ds-text--sm ds-text--muted">
              <code>&lt;Card&gt;</code>, <code>&lt;Button&gt;</code> e <code>&lt;Icon&gt;</code>
              são React. Aqui eles foram reescritos como marcação Angular sobre as mesmas
              classes. Funciona, mas é uma <strong>segunda implementação para manter em
              sincronia</strong> — e é o custo real de admitir outro framework, muito antes
              de qualquer questão de bundle. A saída de arquitetura, se isso deixasse de ser
              um teste, seria promover a camada L1 do DS a Web Components e deixar React e
              Angular como invólucros finos por cima.
            </p>
          </div>
        </div>
      </section>
    </div>
  `
})
export class ProofScreen {
  readonly shell = inject(Shell);
  readonly versaoAngular = VERSION.full;
  readonly cliques = signal(0);
  readonly estadoHttp = signal('Cliente HTTP do shell, já com token, correlation-id e a tag desta jornada.');

  /** `/v1/journeys` já existia: nada novo no BFF para esta jornada. */
  chamarBff(): void {
    this.estadoHttp.set('Chamando o BFF…');
    this.shell.ctx.http
      .get<unknown[]>('/v1/journeys')
      .then((js) => this.estadoHttp.set(
        `O BFF respondeu ${js.length} jornadas visíveis para este colaborador.`
      ))
      .catch((e) => {
        this.shell.ctx.telemetry.error(e, { step: 'http' });
        this.estadoHttp.set('O BFF não respondeu. O erro foi para a telemetria da squad.');
      });
  }

  emitirEvento(): void {
    this.shell.ctx.telemetry.event('teste_angular.evento_manual', { origem: 'botao-da-tela' });
    this.shell.ctx.notify('Evento enviado. Abra o painel de telemetria do portal.', 'info');
  }

  derrubarDeProposito(): void {
    this.shell.ctx.fail(
      new Error('Falha simulada pelo teste em Angular — a jornada pediu para cair.')
    );
  }
}
