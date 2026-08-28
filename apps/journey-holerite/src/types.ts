/**
 * Formatos que a jornada recebe do BFF.
 *
 * Extraidos de `journey.tsx` quando `Detail` virou arquivo proprio na
 * migracao para o DS v2: dois arquivos precisam do mesmo tipo, e duplicar a
 * interface e o caminho mais curto para as duas copias divergirem.
 */
export interface Payslip {
  competencia: string;
  referencia: string;
  bruto: string;
  descontos: string;
  liquido: string;
  situacao: string;
  tipo: 'mensal' | 'decimo-terceiro';
  linhas: { descricao: string; tipo: 'provento' | 'desconto'; valor: string }[];
}

export interface Payroll {
  demonstrativos: Payslip[];
  informeRendimentos: { ano: string; situacao: string }[];
}
