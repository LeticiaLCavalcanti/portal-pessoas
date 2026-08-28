/**
 * Busca global do shell, alimentada pelo índice agregado do BFF -- decisão e
 * alternativas em docs/adr/0009.
 *
 * O resultado navega para uma rota INTERNA da jornada (`/ponto/espelho`): o
 * shell garante a rota, reconhecê-la é da jornada dona, via `ctx.path`.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Text } from '@portal/design-system';
import { usePortal } from '../platform/portal';

interface Hit { journeyId: string; title: string; subtitle?: string; route: string }

export function GlobalSearch() {
  const portal = usePortal();
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await portal.http.get<{ hits: Hit[] }>(`/v1/search?q=${encodeURIComponent(q)}`);
        setHits(r.hits);
        setActive(0);
        portal.telemetry.forJourney({ journeyId: 'shell', squad: 'plataforma', version: '1.0.0' })
          .event('busca.consulta', { term: q, results: r.hits.length });
      } catch { setHits([]); }
    }, 220); // debounce: 10 squads no índice, 1 requisição por pausa de digitação
    return () => clearTimeout(t);
  }, [q, portal]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (h: Hit) => {
    portal.telemetry.forJourney({ journeyId: 'shell', squad: 'plataforma', version: '1.0.0' })
      .event('busca.resultado_aberto', { route: h.route, journey: h.journeyId });
    navigate(h.route);
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  /**
   * Teclado não é enfeite aqui: a busca é a forma mais rápida de chegar a
   * qualquer jornada, e quem usa o portal o dia inteiro não tira a mão do
   * teclado. Sem Enter, digitar e depois teclar Enter não fazia nada.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') {
      const h = hits[active];
      if (h) { e.preventDefault(); choose(h); }
    }
  };

  const listboxId = 'pp-busca-resultados';
  const empty = open && q.trim().length >= 2 && hits.length === 0;

  return (
    <div className="pp-search" ref={boxRef}>
      {/* Decorativo: o campo já tem `aria-label`, então o ícone fica mudo para
          o leitor de tela em vez de anunciar "busca" duas vezes.

          Sem `size`: o tamanho vem de `--pp-search-icon` no styles.css, que é
          a MESMA variável usada para calcular o recuo do texto do campo.
          Cravar o número aqui obrigava os dois lugares a concordarem na mão. */}
      <Icon name="search" className="pp-search__icon" />
      <input
        ref={inputRef}
        className="ds-input pp-search__input"
        placeholder="Buscar em todo o portal"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        aria-label="Buscar em todo o portal"
        role="combobox"
        aria-expanded={open && (hits.length > 0 || empty)}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && hits[active] ? `pp-hit-${active}` : undefined}
      />
      {open && hits.length > 0 && (
        <div className="pp-search__results" id={listboxId} role="listbox" aria-label="Resultados da busca">
          {hits.map((h, i) => (
            <button
              key={h.route}
              id={`pp-hit-${i}`}
              role="option"
              aria-selected={i === active}
              className={`pp-search__hit ${i === active ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(h)}
            >
              <Text size="sm">{h.title}</Text>
              <Text size="xs" tone="subtle">{h.subtitle}</Text>
            </button>
          ))}
        </div>
      )}
      {empty && (
        <div className="pp-search__results" id={listboxId}>
          <Text size="sm" tone="muted" style={{ padding: 'var(--space-3)' }}>
            Nada encontrado para "{q}".
          </Text>
        </div>
      )}
    </div>
  );
}
