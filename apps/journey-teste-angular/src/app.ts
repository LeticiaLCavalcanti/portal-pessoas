/**
 * Jornada: Teste em Angular | dona: squad-plataforma | ver docs/adr/0012.
 *
 * Sem `@angular/router`: quem é dono da URL é o shell, e a jornada só recebe o
 * pedaço abaixo da própria base (`ctx.path`). Um segundo roteador aqui dentro
 * colocaria dois donos no `window.history`.
 */
import { Component, computed, inject } from '@angular/core';
import { Shell } from './shell';
import { ProofScreen } from './proof';
import { DeployScreen } from './deploy';

@Component({
  selector: 'pp-teste-angular',
  standalone: true,
  imports: [ProofScreen, DeployScreen],
  template: `
    @if (secao() === 'deploy') { <pp-deploy /> } @else { <pp-prova /> }
  `
})
export class AppComponent {
  private readonly shell = inject(Shell);
  readonly secao = computed(() => this.shell.path().replace(/^\/+|\/+$/g, ''));
}
