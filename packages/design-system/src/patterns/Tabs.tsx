/**
 * ============================================================================
 *  CAMADA 2 do DS: abas
 * ============================================================================
 *
 * Aba não é botão de ação, e a diferença importa para quem usa: botão GRAVA
 * alguma coisa, aba só troca o que está na tela. Quando a aba ativa é um
 * `Button variant="primary"`, as duas viram o mesmo retângulo laranja sólido e
 * o colaborador perde a única pista de qual delas tem consequência.
 *
 * Este componente também cuida do teclado, que uma fileira de botões não faz:
 * pelo padrão ARIA de tablist, as setas navegam entre abas e o Tab pula a
 * fileira inteira. Sem isso, quem navega por teclado passa por N paradas antes
 * de chegar no conteúdo.
 */
import * as React from 'react';

export interface TabItem {
  /** Valor devolvido no `onSelect`. Normalmente a rota interna da jornada. */
  id: string;
  label: string;
}

export function Tabs({
  items, current, onSelect, label
}: {
  items: readonly TabItem[];
  current: string;
  onSelect: (id: string) => void;
  /** Rótulo da fileira para leitor de tela. Ex.: "Seções de registro de ponto". */
  label: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + items.length) % items.length;
    // Move o foco E seleciona: é o comportamento de "automatic activation" do
    // padrão ARIA, adequado quando trocar de aba é barato (não há formulário
    // pela metade para perder).
    refs.current[next]?.focus();
    onSelect(items[next]!.id);
  };

  return (
    <div className="ds-tabs" role="tablist" aria-label={label}>
      {items.map((t, i) => {
        const isActive = t.id === current;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={isActive}
            /* Só a aba ativa fica na ordem de tabulação -- o resto se alcança
               pelas setas. É o que o padrão ARIA chama de roving tabindex. */
            tabIndex={isActive ? 0 : -1}
            className={`ds-tab ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
