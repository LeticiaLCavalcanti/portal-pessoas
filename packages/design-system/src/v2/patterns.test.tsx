/**
 * ============================================================================
 *  DS v2 — DataList e a quebra estrutural que motivou a v2
 * ============================================================================
 *
 * A afirmação sob teste (MIGRATION.md §3, "DataList — <dl> no lugar de <ul>"):
 *
 *   "<dd> é container de conteúdo de fluxo, então `value` pode ser um Badge,
 *    um botão ou uma Row sem que o navegador reorganize a árvore."
 *
 * A v1 emitia `<p>` para o valor. O parser FECHAVA o parágrafo ao encontrar um
 * `<div>` dentro, o React reclamava de validateDOMNesting e, com hidratação, o
 * nó ficava fora de lugar. Lá o remédio foi `as="div"` no ponto de uso; aqui o
 * problema deixa de existir por construção -- e este teste é o que garante que
 * ele não volte, porque a diferença entre `<dd>` e `<p>` é invisível em
 * revisão de código e o sintoma aparece só em runtime.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Card, DataList } from './patterns';

afterEach(cleanup);

describe('DataList — semântica', () => {
  it('usa <dl>/<dt>/<dd>, e não <ul>/<li>', () => {
    const { container } = render(
      <DataList items={[{ label: 'Total de proventos', value: 'R$ 20.880,00' }]} />
    );

    expect(container.querySelector('dl')).not.toBeNull();
    expect(container.querySelector('dt')?.textContent).toContain('Total de proventos');
    expect(container.querySelector('dd')?.textContent).toBe('R$ 20.880,00');
    // O que a v1 fazia e a v2 deixou de fazer.
    expect(container.querySelector('ul')).toBeNull();
  });

  /**
   * O teste que pega a regressão de verdade.
   *
   * Se alguém trocar o `<dd>` por `<p>` numa refatoração, todas as asserções
   * acima menos uma continuariam passando -- e o sintoma só apareceria em
   * produção, com hidratação. O React acusa aninhamento inválido por
   * `console.error`; espiar esse canal transforma um aviso que ninguém lê num
   * teste vermelho.
   */
  it('aceita ReactNode com <div> no valor sem aninhamento inválido', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <DataList
        items={[
          { label: 'Situação', value: <div className="qualquer-bloco">disponível</div> }
        ]}
      />
    );

    const avisosDeAninhamento = erro.mock.calls
      .map((args) => String(args[0]))
      .filter((msg) => /validateDOMNesting|cannot (?:be a descendant|appear as a descendant)/i.test(msg));

    expect(avisosDeAninhamento, avisosDeAninhamento.join('\n')).toEqual([]);
  });

  it('marca a linha de destaque para o DS decidir a hierarquia do total', () => {
    const { container } = render(
      <DataList
        items={[
          { label: 'Total de proventos', value: 'R$ 20.880,00' },
          { label: 'Líquido a receber', value: 'R$ 15.387,81', emphasis: true }
        ]}
      />
    );

    const linhas = container.querySelectorAll('.ds2-datalist__row');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]!.className).not.toContain('is-emphasis');
    expect(linhas[1]!.className).toContain('is-emphasis');
  });

  it('renderiza o texto auxiliar dentro do rótulo, não do valor', () => {
    const { container } = render(
      <DataList items={[{ label: 'INSS', value: 'R$ 908,86', hint: 'base R$ 8.200,00' }]} />
    );

    expect(container.querySelector('dt')?.textContent).toContain('base R$ 8.200,00');
    expect(container.querySelector('dd')?.textContent).toBe('R$ 908,86');
  });
});

describe('Card — compatibilidade deliberada com a v1', () => {
  /**
   * "Major não é licença para churn" (patterns.tsx). O Card foi o componente
   * mais usado do portal e não tinha nada errado, então a v2 mantém os nomes de
   * prop da v1 de propósito. Este teste existe para que uma "limpeza de API"
   * futura precise passar por cima de uma decisão escrita, e não de um
   * esquecimento.
   */
  it('mantém title, hint, actions e footer com os nomes da v1', () => {
    render(
      <Card
        title="Agosto/2026"
        hint="Competência 2026-08"
        actions={<span>selo</span>}
        footer={<button type="button">Baixar</button>}
      >
        conteúdo
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Agosto/2026' })).toBeDefined();
    expect(screen.getByText('Competência 2026-08')).toBeDefined();
    expect(screen.getByText('selo')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Baixar' })).toBeDefined();
    expect(screen.getByText('conteúdo')).toBeDefined();
  });

  it('não desenha o cabeçalho quando não há título nem ações', () => {
    const { container } = render(<Card>só conteúdo</Card>);
    expect(container.querySelector('.ds2-card__head')).toBeNull();
  });
});
