/**
 * Protocolo da ponte nativo <-> web.
 *
 * Mora em um pacote compartilhado justamente para que os dois lados compilem
 * contra o MESMO tipo. Ponte tipada em um lado só é ponte quebrada com atraso.
 */
export type ParaWeb =
  | { type: 'native:session'; token: string; user: { firstName: string; registration: string } }
  | { type: 'native:theme'; theme: 'light' | 'dark' }
  | { type: 'native:geo'; lat: number; lng: number }
  | { type: 'native:biometria'; ok: boolean; requestId: string }
  | { type: 'native:back' };

export type ParaNativo =
  | { type: 'web:pronto' }
  | { type: 'web:pedir-geo' }
  | { type: 'web:pedir-biometria'; requestId: string; motivo: string }
  | { type: 'web:telemetria'; name: string; props?: Record<string, unknown> }
  | { type: 'web:navegou'; route: string; titulo: string }
  | { type: 'web:abrir-nativo'; journeyId: string };
