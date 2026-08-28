/**
 * "Chrome" do portal: barra superior, catálogo lateral, notificações e avisos.
 *
 * Tudo aqui é do time de plataforma. As squads NÃO podem injetar itens de menu
 * por código -- só declarando o manifesto, para o shell não acumular
 * `if (jornada === 'x')`.
 */
import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Badge, Brand, Button, Icon, Row, Stack, Text } from '@portal/design-system';
import { usePortal } from '../platform/portal';
import { GlobalSearch } from './GlobalSearch';

interface Notification {
  id: string;
  journeyId: string;
  title: string;
  ts: string;
  read: boolean;
}

export function TopBar() {
  const portal = usePortal();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState<Notification[]>([]);
  const navigate = useNavigate();
  const notifRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    portal.http.get<Notification[]>('/v1/notifications').then(setNotifs).catch(() => setNotifs([]));
  }, [portal.http]);

  React.useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  const unread = notifs.filter((n) => !n.read).length;

  /** Marca como lida de forma otimista; o POST que falhar reverte o estado. */
  const openNotification = async (n: Notification) => {
    setNotifOpen(false);
    setNotifs((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    portal.http.post(`/v1/notifications/${n.id}/read`, {}).catch(() => {
      setNotifs((list) => list.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
    });

    const j = portal.journeyById(n.journeyId);
    if (j) navigate(j.route);
    else portal.notify('Esta jornada não está disponível para o seu perfil.', 'info');
  };

  return (
    <header className="pp-topbar">
      {/* Marca, busca e ações precisam ser filhos DIRETOS do header: é o que
          deixa a busca cair para uma linha própria via `order`/`flex-basis`.
          Aninhada junto da marca, ela era espremida a zero em 390px. */}
      <Brand product="Portal Pessoas" onClick={() => navigate('/')} />
      {portal.flags['portal.busca-global'] && <GlobalSearch />}

      <Row gap={2}>
        <div className="pp-notif" ref={notifRef}>
          <Button
            variant="ghost"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`Notificações${unread > 0 ? `, ${unread} não lidas` : ''}`}
            aria-expanded={notifOpen}
          >
            <Icon name="bell" size={18} />
            Avisos
            {unread > 0 && <Badge tone="accent">{unread}</Badge>}
          </Button>
          {notifOpen && (
            <div className="pp-notif__panel">
              <Stack gap={3}>
                {notifs.length === 0 && <Text size="sm" tone="muted">Nenhum aviso por enquanto.</Text>}
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    className={`pp-notif__item ${n.read ? 'is-read' : ''}`}
                    onClick={() => openNotification(n)}
                  >
                    <Text size="sm">{n.title}</Text>
                    <Text size="xs" tone="subtle">
                      {portal.journeyById(n.journeyId)?.name ?? n.journeyId}
                      {!n.read && ' · não lida'}
                    </Text>
                  </button>
                ))}
              </Stack>
            </div>
          )}
        </div>

        {/* O ícone mostra o tema de DESTINO, não o atual. */}
        <Button
          variant="ghost"
          onClick={portal.toggleTheme}
          aria-label={`Mudar para tema ${portal.theme === 'light' ? 'escuro' : 'claro'}`}
        >
          <Icon name={portal.theme === 'light' ? 'moon' : 'sun'} size={18} />
          {portal.theme === 'light' ? 'Escuro' : 'Claro'}
        </Button>

        {/* Indicador de sessão, não botão: não há menu de usuário para abrir. */}
        <span className="pp-user" title={`${portal.user?.name} · matrícula ${portal.user?.registration}`}>
          {portal.user?.firstName?.slice(0, 2).toUpperCase()}
        </span>
      </Row>
    </header>
  );
}

export function Sidebar() {
  const portal = usePortal();
  const byDomain = portal.journeys
    .filter((j) => j.showInCatalog)
    .reduce<Record<string, typeof portal.journeys>>((acc, j) => {
      (acc[j.domain] ??= []).push(j);
      return acc;
    }, {});

  return (
    <nav className="pp-side" aria-label="Catálogo de jornadas">
      <NavLink to="/" end className={({ isActive }) => `pp-side__link ${isActive ? 'is-active' : ''}`}>
        <Icon name="home" />
        <span>Início</span>
      </NavLink>

      {Object.entries(byDomain).map(([domain, js]) => (
        <div key={domain} className="pp-side__group">
          <Text size="xs" tone="subtle" className="pp-side__title">{domain}</Text>
          {js.map((j) => (
            <NavLink
              key={j.id}
              to={j.route}
              className={({ isActive }) => `pp-side__link ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={j.icon} />
              <span className="pp-side__label">{j.name}</span>
              {j.kind === 'legacy' && <Badge>legado</Badge>}
              {j.rollout.percentage < 100 && <Badge tone="warn">{j.rollout.percentage}%</Badge>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function Toasts() {
  const { toasts } = usePortal();
  return (
    <div className="pp-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`pp-toast pp-toast--${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}

/**
 * Painel de observabilidade embutido.
 * Em produção isto não existe -- os mesmos eventos vão para o backend de
 * observabilidade. Aqui ele torna visível, no case, a rastreabilidade exigida
 * pelo requisito não funcional.
 */
export function TelemetryPanel() {
  const portal = usePortal();
  const [open, setOpen] = React.useState(false);
  return (
    <div className={`pp-telemetry ${open ? 'is-open' : ''}`}>
      <button className="pp-telemetry__toggle" onClick={() => setOpen((v) => !v)}>
        Telemetria · {portal.telemetryLog.length} eventos · cid {portal.correlationId}
      </button>
      {open && (
        <div className="pp-telemetry__body">
          {portal.telemetryLog.map((r, i) => (
            <div key={i} className="pp-telemetry__row">
              <span className={`pp-telemetry__type is-${r.type}`}>{r.type}</span>
              <span className="pp-telemetry__squad">{r.squad}</span>
              <span className="pp-telemetry__name">{r.name}</span>
              <span className="pp-telemetry__props">
                {r.props ? JSON.stringify(r.props) : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
