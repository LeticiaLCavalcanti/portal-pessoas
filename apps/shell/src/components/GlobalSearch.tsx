/**
 * Busca global.
 *
 * Decisao: a busca e do SHELL, alimentada por um indice agregado no BFF, e nao
 * uma busca por jornada. Motivo de produto: o colaborador nao sabe (nem deveria
 * saber) em qual squad mora "informe de rendimentos". Motivo tecnico: manter a
 * busca no shell evita carregar 10 microfrontends so para procurar algo.
 *
 * Cada jornada contribui com seu indice (capability `search`) -- o shell nao
 * mantem uma lista chumbada de resultados.
 *
 * O resultado navega para uma rota INTERNA da jornada (`/ponto/espelho`). O
 * shell so garante a rota; quem precisa reconhece-la e a jornada dona, por
 * `ctx.path`. Quando ela nao reconhece, o clique nao tem efeito visivel -- foi
 * exatamente esse o bug corrigido em ponto e beneficios.
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
  const [ativo, setAtivo] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await portal.http.get<{ hits: Hit[] }>(`/v1/search?q=${encodeURIComponent(q)}`);
        setHits(r.hits);
        setAtivo(0);
        portal.telemetry.forJourney({ journeyId: 'shell', squad: 'plataforma', version: '1.0.0' })
          .event('busca.consulta', { termo: q, resultados: r.hits.length });
      } catch { setHits([]); }
    }, 220); // debounce: 10 squads no indice, 1 requisicao por pausa de digitacao
    return () => clearTimeout(t);
  }, [q, portal]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const escolher = (h: Hit) => {
    portal.telemetry.forJourney({ journeyId: 'shell', squad: 'plataforma', version: '1.0.0' })
      .event('busca.resultado_aberto', { rota: h.route, jornada: h.journeyId });
    navigate(h.route);
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  /**
   * Teclado nao e enfeite aqui: a busca e a forma mais rapida de chegar a
   * qualquer jornada, e quem usa o portal o dia inteiro nao tira a mao do
   * teclado. Sem Enter, digitar e depois teclar Enter nao fazia nada.
   */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((i) => (i + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => (i - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') {
      const h = hits[ativo];
      if (h) { e.preventDefault(); escolher(h); }
    }
  };

  const listboxId = 'pp-busca-resultados';
  const vazio = open && q.trim().length >= 2 && hits.length === 0;

  return (
    <div className="pp-search" ref={boxRef}>
      {/* Decorativo: o campo ja tem `aria-label`, entao o icone fica mudo para
          o leitor de tela em vez de anunciar "busca" duas vezes. */}
      <Icon name="search" size={17} className="pp-search__icon" />
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
        aria-expanded={open && (hits.length > 0 || vazio)}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && hits[ativo] ? `pp-hit-${ativo}` : undefined}
      />
      {open && hits.length > 0 && (
        <div className="pp-search__results" id={listboxId} role="listbox" aria-label="Resultados da busca">
          {hits.map((h, i) => (
            <button
              key={h.route}
              id={`pp-hit-${i}`}
              role="option"
              aria-selected={i === ativo}
              className={`pp-search__hit ${i === ativo ? 'is-active' : ''}`}
              onMouseEnter={() => setAtivo(i)}
              onClick={() => escolher(h)}
            >
              <Text size="sm">{h.title}</Text>
              <Text size="xs" tone="subtle">{h.subtitle}</Text>
            </button>
          ))}
        </div>
      )}
      {vazio && (
        <div className="pp-search__results" id={listboxId}>
          <Text size="sm" tone="muted" style={{ padding: 'var(--space-3)' }}>
            Nada encontrado para "{q}".
          </Text>
        </div>
      )}
    </div>
  );
}
