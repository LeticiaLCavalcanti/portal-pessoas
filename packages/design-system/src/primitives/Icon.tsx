/**
 * ============================================================================
 *  CAMADA 1 do DS: iconografia
 * ============================================================================
 *
 * Por que os icones sao SVG inline e nao uma fonte de icones:
 *
 *  1. O IDS tem a fonte proprietaria "Itau Icon", que NAO acompanha este
 *     repositorio (mesma situacao de "Itau Display" e "Itau Text" -- ver
 *     apps/shell/index.html). Depender dela aqui deixaria o menu do portal
 *     como uma fileira de quadradinhos fora da rede corporativa.
 *  2. Fonte de icone falha feio: enquanto o arquivo carrega, o colaborador ve
 *     o caractere cru. SVG inline nasce com a pagina, sem FOUT e sem request.
 *  3. `stroke="currentColor"` faz o icone herdar a cor do contexto -- entao
 *     ele acompanha tema claro/escuro, estado ativo e a barra azul de marca
 *     sem uma linha de CSS por caso.
 *
 * Trocar por "Itau Icon" mais tarde e substituir ESTE arquivo. Nenhum ponto de
 * uso muda, porque todos falam por NOME (`clock`, `bell`), nunca por glifo.
 *
 * ---------------------------------------------------------------------------
 * O nome do icone vem do MANIFESTO da jornada, ou seja, de fora do shell.
 * Por isso um nome desconhecido nao pode quebrar o menu: ele cai no fallback e
 * a jornada continua navegavel. Governanca acontece no code review do registro,
 * nao com uma tela em branco em producao.
 * ---------------------------------------------------------------------------
 */
import * as React from 'react';

/** Traços comuns a todos os ícones: mesma grade de 24, mesma espessura. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const paths: Record<string, React.ReactNode> = {
  /* Navegação do portal */
  home: <><path d="M3 10.4 12 3l9 7.4" /><path d="M5.4 9.3V20a1 1 0 0 0 1 1h11.2a1 1 0 0 0 1-1V9.3" /><path d="M9.8 21v-6.2h4.4V21" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5 16 16" /></>,
  bell: <><path d="M18 8.6c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 5.6-2.4 7-2.4 7h16.8s-2.4-1.4-2.4-7Z" /><path d="M13.7 19.4a2 2 0 0 1-3.4 0" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" /></>,
  moon: <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />,

  /* Domínios de jornada — o nome é semântico, não visual */
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6.8V12l3.4 2" /></>,
  gift: <><rect x="3" y="7.8" width="18" height="4.2" rx="1" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M12 7.8V21" /><path d="M12 7.8H8.6a2.4 2.4 0 1 1 0-4.8C10.8 3 12 7.8 12 7.8Z" /><path d="M12 7.8h3.4a2.4 2.4 0 1 0 0-4.8C13.2 3 12 7.8 12 7.8Z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10.5h18" /></>,
  receipt: <><path d="M5.5 3h13v18l-2.6-1.6L13.3 21l-2.6-1.6L8.1 21l-2.6-1.6Z" /><path d="M9 8h6M9 11.8h6M9 15.6h3.6" /></>,
  archive: <><rect x="3" y="4" width="18" height="4.4" rx="1" /><path d="M5 8.4V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.4" /><path d="M10 12.2h4" /></>
};

export type IconName = keyof typeof paths;

export function Icon({
  name, size = 20, label, className = ''
}: {
  /** Nome semântico. Desconhecido = fallback textual, nunca erro. */
  name: string;
  size?: number;
  /**
   * Só quando o ícone é a ÚNICA informação. Ao lado de um rótulo de texto ele
   * deve ficar mudo para o leitor de tela, senão o conteúdo é anunciado duas
   * vezes ("sino Avisos").
   */
  label?: string;
  className?: string;
}) {
  const desenho = paths[name];

  if (!desenho) {
    /**
     * Fallback: a jornada declarou um ícone que este shell não conhece --
     * porque foi publicada depois, ou porque houve erro de digitação no
     * registro. Mostramos a marca crua do manifesto em vez de nada: o item
     * continua clicável e o problema fica visível para quem mantém o registro.
     */
    return (
      <span
        className={`ds-icon ds-icon--raw ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label}
      >
        {name}
      </span>
    );
  }

  return (
    <svg
      {...base}
      width={size}
      height={size}
      className={`ds-icon ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {desenho}
    </svg>
  );
}

/** Nomes que este shell sabe desenhar. Útil para validar o registro no CI. */
export const iconNames = Object.keys(paths);
