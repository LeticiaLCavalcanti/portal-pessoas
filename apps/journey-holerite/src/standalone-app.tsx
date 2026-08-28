/**
 * Contexto FALSO do portal, para desenvolvimento isolado.
 *
 * Ele é escrito contra o mesmo tipo `JourneyContext` do contrato. Se o contrato
 * mudar e este arquivo parar de compilar, o time descobre no próprio build --
 * e não em produção, depois do deploy do shell.
 *
 * O harness também simula o que o shell faz de verdade: navegação real pela
 * History API (para `ctx.path` e `onPathChange` serem exercitados fora do
 * portal) e `fail` visível na tela, e não só no console.
 */
import '@portal/design-system/styles.css';
import journey from './journey';
import type { JourneyContext } from '@portal/journey-contract';

const BFF = 'http://localhost:4000';
const BASE = '/holerite';

const http = {
  get: <T,>(p: string) => fetch(BFF + p).then((r) => r.json() as Promise<T>),
  post: <T,>(p: string, b: unknown) =>
    fetch(BFF + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
      .then((r) => r.json() as Promise<T>)
};

const listeners = new Set<(p: string) => void>();
const relativeRoute = () => location.pathname.startsWith(BASE)
  ? location.pathname.slice(BASE.length) || '/'
  : '/';

const root = document.getElementById('root')!;

const ctx: JourneyContext = {
  user: { id: 'u-dev', name: 'Dev Local', firstName: 'Dev', registration: '000000', roles: ['colaborador'], area: 'Tecnologia' },
  http,
  telemetry: {
    event: (n, p) => console.info('[event]', n, p ?? ''),
    error: (e, p) => console.error('[error]', e, p ?? ''),
    timing: (n, ms) => console.info('[timing]', n, ms)
  },
  navigate: (to) => {
    const target = to.startsWith('/') ? to : `${BASE}/${to}`;
    history.pushState(null, '', target);
    listeners.forEach((cb) => cb(relativeRoute()));
  },
  path: relativeRoute(),
  onPathChange: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
  theme: 'light',
  onThemeChange: () => () => undefined,
  // Esta jornada não depende de flag; o campo existe porque o contrato o exige.
  flags: {},
  notify: (m, k) => console.info('[notify]', k ?? 'info', m),
  /** No portal isto vira a superfície degradada do shell. Aqui, uma mensagem. */
  fail: (e) => {
    console.error('[fail]', e);
    root.innerHTML =
      '<p style="font-family:monospace">A jornada reportou falha irrecuperável: ' +
      (e instanceof Error ? e.message : String(e)) +
      '<br />No portal, o shell mostraria aqui a tela degradada com rastreio e retry.</p>';
  }
};

window.addEventListener('popstate', () => listeners.forEach((cb) => cb(relativeRoute())));

document.body.style.padding = '24px';
document.body.style.background = 'var(--c-bg-canvas)';
journey.mount(root, ctx);
