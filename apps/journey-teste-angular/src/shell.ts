/**
 * A ponte entre o JourneyContext e o Angular. Único arquivo da jornada que
 * fala "shell"; do AppComponent para baixo é Angular idiomático.
 */
import { InjectionToken, Injectable, inject, signal, DestroyRef } from '@angular/core';
import type { JourneyContext } from '@portal/journey-contract';

export const SHELL_CONTEXT = new InjectionToken<JourneyContext>('portal.journeyContext');

@Injectable()
export class Shell {
  readonly ctx = inject(SHELL_CONTEXT);

  /**
   * O shell chama estes callbacks de fora de qualquer contexto do Angular (é
   * React rodando no host). Com zone.js seria preciso `NgZone.run()` para a
   * tela repintar; escrever num signal já notifica o scheduler, e é isso que
   * permite a jornada ser zoneless -- ver docs/adr/0012.
   */
  readonly theme = signal(this.ctx.theme);
  readonly path = signal(this.ctx.path);

  constructor() {
    // As assinaturas devolvem cancelamento e ele PRECISA ser chamado: a jornada
    // é montada e desmontada a cada navegação do portal.
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(this.ctx.onThemeChange((t) => this.theme.set(t)));
    destroyRef.onDestroy(this.ctx.onPathChange((p) => this.path.set(p)));
  }
}
