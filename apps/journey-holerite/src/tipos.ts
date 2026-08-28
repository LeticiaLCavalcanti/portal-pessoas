/**
 * Formatos que a jornada recebe do BFF.
 *
 * Extraidos de `journey.tsx` quando `Detalhe` virou arquivo proprio na
 * migracao para o DS v2: dois arquivos precisam do mesmo tipo, e duplicar a
 * interface e o caminho mais curto para as duas copias divergirem.
 */
export interface Demonstrativo {
  competencia: string;
  referencia: string;
  bruto: string;
  descontos: string;
  liquido: string;
  situacao: string;
  tipo: 'mensal' | 'decimo-terceiro';
  linhas: { descricao: string; tipo: 'provento' | 'desconto'; valor: string }[];
}

export interface Holerite {
  demonstrativos: Demonstrativo[];
  informeRendimentos: { ano: string; situacao: string }[];
}
