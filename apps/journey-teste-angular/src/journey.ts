/**
 * O módulo exposto: equivalente do `journey.tsx` das jornadas React. As duas
 * versões implementam a mesma interface `JourneyModule`, e o shell não tem um
 * caminho para React e outro para Angular. Ver docs/adr/0012.
 */

// PRECISA vir primeiro: o compilador se instala no runtime do Angular como
// efeito colateral de módulo, e decorator avaliado antes disso nasce sem
// compilação. É também o item mais caro do bundle -- trocar JIT por AOT é o
// primeiro requisito para esta jornada virar produto.
import '@angular/compiler';

import { ApplicationRef, createComponent, provideZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import type { JourneyContext, JourneyModule } from '@portal/journey-contract';
import { AppComponent } from './app';
import { Shell, SHELL_CONTEXT } from './shell';

const journey: JourneyModule = {
  contractVersion: '1.1',

  async mount(container: HTMLElement, ctx: JourneyContext) {
    // `createApplication` + `createComponent`, e não `bootstrapApplication`:
    // este último procura o seletor da raiz no documento INTEIRO, ou seja,
    // presume ser dono da página -- que é o que uma jornada não é.
    const appRef: ApplicationRef = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SHELL_CONTEXT, useValue: ctx },
        Shell
      ]
    });

    // Um elemento PRÓPRIO dentro do container: `ComponentRef.destroy()` remove
    // o hospedeiro do DOM, e arrancar o `<div>` do shell quebraria a próxima
    // renderização dele com `NotFoundError`.
    const host = container.ownerDocument.createElement('div');
    container.appendChild(host);

    const componentRef = createComponent(AppComponent, {
      environmentInjector: appRef.injector,
      hostElement: host
    });
    appRef.attachView(componentRef.hostView);

    ctx.telemetry.event('teste_angular.montada', { framework: 'angular', modo: 'jit' });

    return () => {
      componentRef.destroy();
      appRef.destroy();
      host.remove();
    };
  }
};

export default journey;
