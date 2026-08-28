/**
 * ============================================================================
 *  Holerite / Detail — a prova de convivência entre as duas versões do DS
 * ============================================================================
 *
 * A afirmação sob teste está no README e na ADR 0011:
 *
 *   "As duas versões do DS renderizam na mesma árvore React, e a squad migra um
 *    ARQUIVO por vez."
 *
 * Este arquivo é a primeira tela do portal na v2. Os testes abaixo checam que
 * ele de fato usa a v2, que um primitivo da v1 (`Icon`) funciona DENTRO de um
 * primitivo da v2 (`Button`) sem adaptador, e que o `loading` está ligado ao
 * estado real de download -- que foi o ganho concreto da migração.
 *
 * Não é teste de aparência: é teste de que a fronteira entre as versões não
 * existe em runtime. Se ela passar a existir, é aqui que aparece primeiro.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { JourneyContext } from '@portal/journey-contract';
import { Detail } from './Detail';
import type { Payslip } from './types';

afterEach(cleanup);

const payslip: Payslip = {
  competencia: '2026-08',
  referencia: 'Agosto/2026',
  bruto: 'R$ 20.880,00',
  descontos: 'R$ 5.492,19',
  liquido: 'R$ 15.387,81',
  situacao: 'pago',
  tipo: 'mensal',
  linhas: [
    { descricao: 'Salário base', tipo: 'provento', valor: 'R$ 20.000,00' },
    { descricao: 'INSS', tipo: 'desconto', valor: 'R$ 908,86' }
  ]
};

/**
 * Contexto mínimo, escrito contra o tipo real do contrato. Se o contrato
 * mudar de forma incompatível, este arquivo para de compilar -- que é o mesmo
 * mecanismo que o harness `standalone.tsx` usa para a squad descobrir a
 * mudança no próprio build, e não depois do deploy do shell.
 */
function fakeContext(over: Partial<JourneyContext> = {}): JourneyContext {
  return {
    user: {
      id: 'u-1', name: 'Dev', firstName: 'Dev',
      registration: '000000', roles: [], area: 'Tecnologia'
    },
    http: { get: vi.fn(() => new Promise(() => {})), post: vi.fn() },
    telemetry: { event: vi.fn(), error: vi.fn(), timing: vi.fn() },
    navigate: vi.fn(),
    path: '/2026-08',
    onPathChange: () => () => undefined,
    theme: 'light',
    onThemeChange: () => () => undefined,
    flags: {},
    notify: vi.fn(),
    fail: vi.fn(),
    ...over
  } as JourneyContext;
}

describe('Detail — está de fato na v2', () => {
  it('renderiza os componentes com as classes da v2', () => {
    const { container } = render(<Detail ctx={fakeContext()} d={payslip} />);

    expect(container.querySelector('.ds2-card')).not.toBeNull();
    expect(container.querySelector('.ds2-datalist')).not.toBeNull();
    expect(container.querySelector('.ds2-btn')).not.toBeNull();
    expect(container.querySelector('.ds2-badge')).not.toBeNull();
  });

  it('usa a estrutura <dl> da v2 para os valores do demonstrativo', () => {
    const { container } = render(<Detail ctx={fakeContext()} d={payslip} />);

    const labels = [...container.querySelectorAll('dt')].map((n) => n.textContent);
    expect(labels).toContain('Total de proventos');
    expect(labels).toContain('Líquido a receber');
  });

  /** O total é destacado pelo DS, não por um <Text size="lg"> no ponto de uso. */
  it('marca o líquido a receber como linha de destaque', () => {
    const { container } = render(<Detail ctx={fakeContext()} d={payslip} />);

    const emphasised = container.querySelector('.ds2-datalist__row.is-emphasis');
    expect(emphasised?.querySelector('dt')?.textContent).toContain('Líquido a receber');
    expect(emphasised?.querySelector('dd')?.textContent).toBe('R$ 15.387,81');
  });
});

describe('Detail — convivência v1 + v2 na mesma árvore', () => {
  /**
   * O teste mais direto da tese: `Icon` é primitivo da v1, reexportado pela
   * superfície `/v2`, e está DENTRO de um `Button` da v2. Um `<svg>` com a
   * classe `ds-icon` (v1) dentro de um `<button>` com a classe `ds2-btn` (v2),
   * no mesmo nó, sem adaptador e sem wrapper.
   */
  it('renderiza um Icon da v1 dentro de um Button da v2', () => {
    render(<Detail ctx={fakeContext()} d={payslip} />);

    const button = screen.getByRole('button', { name: /Baixar demonstrativo/ });
    expect(button.className).toContain('ds2-btn');

    const icon = button.querySelector('svg.ds-icon');
    expect(icon, 'o Icon da v1 deveria renderizar dentro do Button da v2').not.toBeNull();
  });

  /**
   * `ds-grid` é utilitário de layout da v1 e continua valendo numa tela v2 --
   * a v2 não redefiniu utilitário de layout, então não há o que migrar. Se
   * alguém "padronizar" isso para `ds2-grid` sem criar a classe, a grade de
   * proventos e descontos vira uma coluna só, em silêncio.
   */
  it('mantém o utilitário de grade da v1 na tela migrada', () => {
    const { container } = render(<Detail ctx={fakeContext()} d={payslip} />);
    expect(container.querySelector('.ds-grid')).not.toBeNull();
  });

  it('separa proventos e descontos em cards próprios', () => {
    render(<Detail ctx={fakeContext()} d={payslip} />);

    expect(screen.getByRole('heading', { name: 'Proventos' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Descontos' })).toBeDefined();
    expect(screen.getByText('Salário base')).toBeDefined();
    expect(screen.getByText('INSS')).toBeDefined();
  });
});

describe('Detail — o loading que a v2 trouxe', () => {
  /**
   * O ganho concreto da migração (MIGRATION.md §3): a v1 trocava o RÓTULO na
   * mão, o que não anuncia nada para leitor de tela e mudava a largura do botão
   * no meio do clique. Aqui o rótulo PERMANECE e o estado vai para `aria-busy`.
   *
   * O `http.get` do contexto falso nunca resolve, de propósito: congela a tela
   * no estado intermediário, que é o único momento em que o comportamento é
   * observável.
   */
  it('marca aria-busy e preserva o rótulo enquanto baixa', () => {
    render(<Detail ctx={fakeContext()} d={payslip} />);

    const button = screen.getByRole('button', { name: /Baixar demonstrativo/ });
    expect(button.hasAttribute('aria-busy')).toBe(false);

    fireEvent.click(button);

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.textContent).toContain('Baixar demonstrativo');
  });

  it('pede o documento da competência certa ao BFF', () => {
    const get = vi.fn(() => new Promise(() => {}));
    render(<Detail ctx={fakeContext({ http: { get, post: vi.fn() } as never })} d={payslip} />);

    fireEvent.click(screen.getByRole('button', { name: /Baixar demonstrativo/ }));

    expect(get).toHaveBeenCalledWith('/v1/holerite/2026-08/documento');
  });

  it('navega de volta para a lista pelo botão de voltar', () => {
    const navigate = vi.fn();
    render(<Detail ctx={fakeContext({ navigate })} d={payslip} />);

    fireEvent.click(screen.getByRole('button', { name: /Todos os demonstrativos/ }));

    expect(navigate).toHaveBeenCalledWith('/holerite');
  });
});
