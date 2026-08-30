/**
 * Contexto FALSO do portal, para desenvolvimento isolado em :5005. É a tradução
 * linha a linha do `standalone-app.tsx` das jornadas React -- o harness é
 * escrito contra `JourneyContext`, que não menciona framework.
 */
import '@portal/design-system/styles.css';
import journey from './journey';
import type { JourneyContext } from '@portal/journey-contract';

const BFF = 'http://localhost:4000';
const BASE = '/teste-angular';

const http = {
  get: <T,>(p: string) => fetch(BFF + p).then((r) => r.json() as Promise<T>),
  post: <T,>(p: string, b: unknown) =>
    fetch(BFF + p, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(b)
    }).then((r) => r.json() as Promise<T>)
};

const pathListeners = new Set<(p: string) => void>();
const themeListeners = new Set<(t: 'light' | 'dark') => void>();

const relativeRoute = () =>
  location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || '/' : '/';

const root = document.getElementById('root')!;

const ctx: JourneyContext = {
  user: {
    id: 'u-dev', name: 'Dev Local', firstName: 'Dev',
    registration: '000000', roles: ['colaborador'], area: 'Tecnologia'
  },
  http,
  telemetry: {
    event: (n, p) => console.info('[event]', n, p ?? ''),
    error: (e, p) => console.error('[error]', e, p ?? ''),
    timing: (n, ms) => console.info('[timing]', n, ms)
  },
  navigate: (to) => {
    const target = to.startsWith('/') ? to : `${BASE}/${to}`;
    history.pushState(null, '', target);
    pathListeners.forEach((cb) => cb(relativeRoute()));
  },
  path: relativeRoute(),
  onPathChange: (cb) => { pathListeners.add(cb); return () => pathListeners.delete(cb); },
  theme: 'light',
  onThemeChange: (cb) => { themeListeners.add(cb); return () => themeListeners.delete(cb); },
  flags: {},
  notify: (m, k) => console.info('[notify]', k ?? 'info', m),
  fail: (e) => {
    console.error('[fail]', e);
    root.innerHTML =
      '<p style="font-family:monospace">A jornada reportou falha irrecuperável: ' +
      (e instanceof Error ? e.message : String(e)) +
      '<br />No portal, o shell mostraria aqui a tela degradada com rastreio e retry.</p>';
  }
};

window.addEventListener('popstate', () => pathListeners.forEach((cb) => cb(relativeRoute())));

// Fora do portal não há barra superior: este botão faz o mesmo que o shell faz
// (escrever `data-theme` na raiz), para conferir o tema escuro isoladamente.
const themeButton = document.createElement('button');
themeButton.className = 'ds-btn ds-btn--secondary';
themeButton.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:10';
themeButton.textContent = 'Alternar tema';
themeButton.onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  themeListeners.forEach((cb) => cb(next));
};
document.body.appendChild(themeButton);

document.body.style.padding = '24px';
document.body.style.background = 'var(--c-bg-canvas)';

journey.mount(root, ctx);
