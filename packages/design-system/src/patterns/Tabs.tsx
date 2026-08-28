/**
 * ============================================================================
 *  CAMADA 2 do DS: abas
 * ============================================================================
 *
 * Aba nao e botao de acao, e a diferenca importa para quem usa: botao GRAVA
 * alguma coisa, aba so troca o que esta na tela. Quando a aba ativa e um
 * `Button variant="primary"`, as duas viram o mesmo retangulo laranja solido e
 * o colaborador perde a unica pista de qual delas tem consequencia.
 *
 * Este componente tambem cuida do teclado, que uma fileira de botoes nao faz:
 * pelo padrao ARIA de tablist, as setas navegam entre abas e o Tab pula a
 * fileira inteira. Sem isso, quem navega por teclado passa por N paradas antes
 * de chegar no conteudo.
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
  /** Rotulo da fileira para leitor de tela. Ex.: "Seções de registro de ponto". */
  label: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + items.length) % items.length;
    // Move o foco E seleciona: e o comportamento de "automatic activation" do
    // padrao ARIA, adequado quando trocar de aba e barato (nao ha formulario
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
            /* So a aba ativa fica na ordem de tabulacao -- o resto se alcanca
               pelas setas. E o que o padrao ARIA chama de roving tabindex. */
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
