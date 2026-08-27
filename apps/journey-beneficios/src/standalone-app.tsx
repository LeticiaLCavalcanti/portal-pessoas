/**
 * Contexto FALSO do portal, para desenvolvimento isolado.
 *
 * Ele e escrito contra o mesmo tipo `JourneyContext` do contrato. Se o contrato
 * mudar e este arquivo parar de compilar, o time descobre no proprio build --
 * e nao em producao, depois do deploy do shell.
 *
 * O harness tambem simula o que o shell faz de verdade: navegacao real pela
 * History API (para `ctx.path` e `onPathChange` serem exercitados fora do
 * portal) e `fail` visivel na tela, e nao so no console.
 */
import '@portal/design-system/styles.css';
import journey from './journey';
import type { JourneyContext } from '@portal/journey-contract';

const BFF = 'http://localhost:4000';
const BASE = '/beneficios';

const http = {
  get: <T,>(p: string) => fetch(BFF + p).then((r) => r.json() as Promise<T>),
  post: <T,>(p: string, b: unknown) =>
    fetch(BFF + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
      .then((r) => r.json() as Promise<T>)
};

const ouvintes = new Set<(p: string) => void>();
const rotaRelativa = () => location.pathname.startsWith(BASE)
  ? location.pathname.slice(BASE.length) || '/'
  : '/';

const raiz = document.getElementById('root')!;

const ctx: JourneyContext = {
  user: { id: 'u-dev', name: 'Dev Local', firstName: 'Dev', registration: '000000', roles: ['colaborador'], area: 'Tecnologia' },
  http,
  telemetry: {
    event: (n, p) => console.info('[event]', n, p ?? ''),
    error: (e, p) => console.error('[error]', e, p ?? ''),
    timing: (n, ms) => console.info('[timing]', n, ms)
  },
  navigate: (to) => {
    const destino = to.startsWith('/') ? to : `${BASE}/${to}`;
    history.pushState(null, '', destino);
    ouvintes.forEach((cb) => cb(rotaRelativa()));
  },
  path: rotaRelativa(),
  onPathChange: (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
  theme: 'light',
  onThemeChange: () => () => undefined,
  flags: { 'beneficios.reembolso-v2': true },
  notify: (m, k) => console.info('[notify]', k ?? 'info', m),
  /** No portal isto vira a superficie degradada do shell. Aqui, uma mensagem. */
  fail: (e) => {
    console.error('[fail]', e);
    raiz.innerHTML =
      '<p style="font-family:monospace">A jornada reportou falha irrecuperável: ' +
      (e instanceof Error ? e.message : String(e)) +
      '<br />No portal, o shell mostraria aqui a tela degradada com rastreio e retry.</p>';
  }
};

window.addEventListener('popstate', () => ouvintes.forEach((cb) => cb(rotaRelativa())));

document.body.style.padding = '24px';
document.body.style.background = 'var(--c-bg-canvas)';
journey.mount(raiz, ctx);
