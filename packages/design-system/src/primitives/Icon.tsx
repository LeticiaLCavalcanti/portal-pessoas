/**
 * ============================================================================
 *  CAMADA 1 do DS: iconografia
 * ============================================================================
 *
 * SVG inline, endereçado por nome semântico, com fallback tolerante a nome
 * desconhecido. Decisão e alternativas: docs/adr/0008.
 *
 * Adotar a fonte "Itaú Icon" é substituir ESTE arquivo — nenhum ponto de uso
 * muda, porque todos falam por nome.
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
  archive: <><rect x="3" y="4" width="18" height="4.4" rx="1" /><path d="M5 8.4V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.4" /><path d="M10 12.2h4" /></>,

  /* Estado do portal */
  alert: <><path d="M10.3 3.9 2.4 17.6a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9.4v4.4" /><path d="M12 17.2h.01" /></>
};

export type IconName = keyof typeof paths;

export function Icon({
  name, size = 20, label, className = ''
}: {
  /** Nome semântico. Desconhecido = fallback textual, nunca erro. */
  name: string;
  size?: number;
  /** Só quando o ícone é a ÚNICA informação — ao lado de texto, deve ficar mudo. */
  label?: string;
  className?: string;
}) {
  const shape = paths[name];

  if (!shape) {
    // Nome desconhecido: mostra a marca crua do manifesto, para o item seguir
    // clicavel e o erro de registro ficar visivel.
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
      {shape}
    </svg>
  );
}

/** Nomes que este shell sabe desenhar. Útil para validar o registro no CI. */
export const iconNames = Object.keys(paths);
