/**
 * ============================================================================
 *  DS v2 — a ponte de compatibilidade com a v1
 * ============================================================================
 *
 * A afirmação sob teste está em MIGRATION.md e na ADR 0011:
 *
 *   "Trocar o import é, sozinho, uma mudança SEM EFEITO. As props da v1
 *    continuam compilando e continuam funcionando."
 *
 * Se essa frase deixar de ser verdade, a migração gradual deixa de existir --
 * e o modo de descobrir seria uma squad abrindo um bug em produção depois de
 * trocar uma linha de import que era para ser inofensiva. É exatamente o tipo
 * de regressão que não aparece em revisão de código: a tradução é uma tabela
 * de três linhas que ninguém relê.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Badge, Button } from './primitives';
import { _limparAvisos } from './deprecations';

/**
 * O aviso de depreciacao e comportamento ESPERADO na maioria destes testes.
 * Sem silenciar, uma suite verde imprime cinco blocos de stderr -- e uma suite
 * que sempre suja o stderr treina o time a nao ler stderr.
 *
 * Silenciamos so `console.warn`: o React emite os avisos dele (aninhamento de
 * DOM invalido, chave faltando) por `console.error`, que segue visivel.
 * `restoreMocks: true` na config devolve o original a cada teste, e os testes
 * que ASSERTAM sobre o aviso espiam por cima deste mock normalmente.
 */
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  // O registro de "ja avisei" e modulo-level e sobrevive entre testes; sem
  // limpar, o teste de "avisa uma vez por chave" passaria por acidente.
  _limparAvisos();
});

describe('Button — tradução das props da v1', () => {
  it('traduz variant="primary" para solid + tone accent', () => {
    render(<Button variant="primary">Salvar</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('ds2-btn--solid');
    expect(btn.className).toContain('ds2-btn--tone-accent');
  });

  it('traduz variant="secondary" para outline + tone accent', () => {
    render(<Button variant="secondary">Informe</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('ds2-btn--outline');
    expect(btn.className).toContain('ds2-btn--tone-accent');
  });

  /**
   * O caso que a tabela de tradução sozinha erraria.
   *
   * Uma squad no meio da migração escreve `variant="primary" tone="critical"`:
   * migrou o tom, ainda não migrou a ênfase. Se a tradução da v1 sobrescrevesse
   * o `tone` explícito, o botão voltaria para laranja de marca sem nenhum aviso
   * -- e o botão destrutivo perderia a única pista visual de que é destrutivo.
   */
  it('deixa o tone explícito vencer a tradução da v1', () => {
    render(<Button variant="primary" tone="critical">Excluir</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('ds2-btn--solid');
    expect(btn.className).toContain('ds2-btn--tone-critical');
    expect(btn.className).not.toContain('ds2-btn--tone-accent');
  });

  /**
   * Ghost sem tom é secundário (voltar, cancelar). Na v1 ele usava
   * `--c-fg-muted`; se o default virasse `accent`, toda tela já migrada seria
   * repintada de laranja de uma versão para a outra.
   */
  it('usa tone neutral para ghost sem tom explícito', () => {
    render(<Button variant="ghost">Voltar</Button>);
    expect(screen.getByRole('button').className).toContain('ds2-btn--tone-neutral');
  });

  it('usa solid + accent como padrão quando nada é passado', () => {
    render(<Button>Ação</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('ds2-btn--solid');
    expect(btn.className).toContain('ds2-btn--tone-accent');
  });
});

describe('Button — estado de carregando', () => {
  /**
   * O motivo de `loading` existir (MIGRATION.md, item 3.1): a v1 trocava o
   * RÓTULO na mão, o que não anuncia nada para leitor de tela -- texto que muda
   * dentro de um botão não é região viva.
   */
  it('desabilita, marca aria-busy e PRESERVA o rótulo', () => {
    render(<Button loading>Baixar demonstrativo</Button>);
    const btn = screen.getByRole<HTMLButtonElement>('button');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.textContent).toContain('Baixar demonstrativo');
  });

  /**
   * `aria-busy` AUSENTE, e não `aria-busy="false"`.
   *
   * Não é preciosismo de atributo: `aria-busy="false"` é uma afirmação
   * explícita de "este elemento não está ocupado", e alguns leitores de tela
   * tratam a presença do atributo como região a observar. O componente emite
   * `undefined` justamente para o atributo não existir -- e um `?? false`
   * acidental em manutenção futura quebraria isso em silêncio.
   */
  it('não emite aria-busy quando não está carregando', () => {
    render(<Button>Baixar demonstrativo</Button>);
    expect(screen.getByRole('button').hasAttribute('aria-busy')).toBe(false);
  });

  it('continua desabilitado quando disabled e loading concorrem', () => {
    render(<Button disabled loading>Ação</Button>);
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
  });
});

describe('Badge — tradução dos tons da v1', () => {
  it.each([
    ['warn', 'ds2-badge--warning'],
    ['danger', 'ds2-badge--critical']
  ] as const)('traduz tone="%s" para %s', (tomV1, classeEsperada) => {
    render(<Badge tone={tomV1}>selo</Badge>);
    expect(screen.getByText('selo').className).toContain(classeEsperada);
  });

  /** Na v1, ausência de tom desenhava um selo cinza. Continua desenhando. */
  it('usa neutral quando nenhum tom é passado', () => {
    render(<Badge>rascunho</Badge>);
    expect(screen.getByText('rascunho').className).toContain('ds2-badge--neutral');
  });

  it('mantém os tons que não mudaram entre as versões', () => {
    render(<Badge tone="success">pago</Badge>);
    expect(screen.getByText('pago').className).toContain('ds2-badge--success');
  });
});

describe('Aviso de depreciação', () => {
  /**
   * O aviso é a MÉTRICA do débito: enquanto ele aparecer no console de alguma
   * squad, a v1 não sai do pacote (ADR 0011). Se ele parar de ser emitido, o
   * time de plataforma perde o único sinal de que ainda há ponto de uso na
   * ponte -- e a v3 nasce carregando a v1 nas costas.
   */
  it('avisa ao receber prop da v1', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Button variant="primary">Salvar</Button>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('variant="primary"');
    expect(warn.mock.calls[0]![0]).toContain('MIGRATION.md');
  });

  /**
   * Uma vez por CHAVE, não por render.
   *
   * Um Badge depreciado dentro de uma lista de 200 linhas emitiria 200 avisos
   * por render, e um console inutilizável é o mesmo que nenhum aviso.
   */
  it('avisa uma vez por chave, não uma vez por render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <>
        <Button variant="primary">a</Button>
        <Button variant="primary">b</Button>
        <Button variant="primary">c</Button>
      </>
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('avisa separadamente para chaves diferentes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <>
        <Button variant="primary">a</Button>
        <Button variant="secondary">b</Button>
        <Badge tone="warn">c</Badge>
      </>
    );
    expect(warn).toHaveBeenCalledTimes(3);
  });

  /**
   * Em produção o corpo da função vira código morto -- o bundler substitui o
   * literal `process.env.NODE_ENV` e o minificador remove o bloco. O
   * colaborador não paga bytes nem ruído de console pelo nosso débito técnico.
   */
  it('fica silencioso em produção', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      render(<Button variant="primary">Salvar</Button>);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = anterior;
    }
  });
});
