/**
 * ============================================================================
 *  CONTRATO SHELL <-> JORNADA
 * ============================================================================
 *
 * Único ponto de acoplamento entre o shell e as ~10 squads. Deliberadamente
 * pequeno, agnóstico de framework e versionado por SemVer independente.
 *
 * Decisão e trade-offs: docs/adr/0002.
 * Estado do contrato (1.0 -> 1.1): tabela ao final da docs/adr/0002.
 */
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* 1. Manifesto: como o shell descobre uma jornada em runtime                  */
/* -------------------------------------------------------------------------- */

export const journeyKind = z.enum([
  'remote', // microfrontend moderno carregado via Module Federation
  'legacy', // plataforma legada embarcada em iframe/WebView com ponte
  'native'  // jornada que só existe no app (biometria, câmera, GPS)
]);

export const rolloutSchema = z.object({
  enabled: z.boolean(),
  /** % de colaboradores que veem a versão moderna. O resto cai no fallback. */
  percentage: z.number().min(0).max(100),
  /** Grupos que sempre veem (canary interno). */
  allowlist: z.array(z.string()).default([]),
  /** Jornada legada equivalente, usada como fallback de rollout E de falha. */
  fallbackJourneyId: z.string().optional()
});

export const journeyManifestSchema = z.object({
  /**
   * Id da jornada. É também a chave do container de Module Federation:
   * `@portal/build-preset` deriva o nome do container do id (kebab -> snake),
   * dos dois lados. Não há um segundo nome para manter em sincronia.
   */
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  description: z.string().default(''),
  /**
   * NOME semântico do ícone (`clock`, `gift`, `receipt`), resolvido pelo
   * Design System -- nunca um glifo, um caractere ou uma URL de imagem.
   *
   * `string` livre e não enum, de propósito -- ver docs/adr/0008.
   */
  icon: z.string().default('*'),
  /** Domínio de negócio. Define ownership e agrupamento no catálogo. */
  domain: z.string(),
  /** Squad dona. Vira tag em todo evento de telemetria e alvo do alerta. */
  squad: z.string(),
  kind: journeyKind,
  /** SemVer do bundle publicado. O shell nunca depende de "latest". */
  version: z.string(),
  /** Rota que o shell reserva para a jornada. Ela é dona de tudo abaixo dela. */
  route: z.string().startsWith('/'),
  /** URL do remoteEntry (kind=remote) ou da página legada (kind=legacy). */
  entry: z.string().url(),
  /** Módulo exposto no Module Federation. Ex: './journey' */
  exposedModule: z.string().default('./journey'),
  /** Jornadas de fallback não aparecem no catálogo -- evita item duplicado. */
  showInCatalog: z.boolean().default(true),
  /** Permissões exigidas. O BFF já filtra, o shell só não renderiza no menu. */
  requiredRoles: z.array(z.string()).default([]),
  /** Recursos que a jornada oferece ao portal (ex.: indexar na busca global). */
  capabilities: z.array(z.enum(['search', 'home-widget', 'notifications'])).default([]),
  rollout: rolloutSchema,
  /** Orçamento de carregamento. Estourou = alerta pro time dono, não pro shell. */
  budget: z.object({ loadTimeoutMs: z.number().default(8000) }).default({ loadTimeoutMs: 8000 })
});

export type JourneyManifest = z.infer<typeof journeyManifestSchema>;
export type Rollout = z.infer<typeof rolloutSchema>;

/* -------------------------------------------------------------------------- */
/* 2. Contexto: o que o shell entrega para a jornada                           */
/* -------------------------------------------------------------------------- */

export interface JourneyUser {
  id: string;
  name: string;
  firstName: string;
  registration: string;
  roles: string[];
  area: string;
}

export interface JourneyTelemetry {
  event(name: string, props?: Record<string, unknown>): void;
  error(err: unknown, props?: Record<string, unknown>): void;
  timing(name: string, ms: number): void;
}

export interface JourneyHttp {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
}

export interface JourneyContext {
  /** Sessão já resolvida pelo shell. A jornada NUNCA faz login. */
  user: JourneyUser;
  /** Cliente HTTP para o BFF, já com token, correlation-id e tag da jornada. */
  http: JourneyHttp;
  /** Telemetria pré-marcada com journeyId/squad/version. */
  telemetry: JourneyTelemetry;
  /** Navegação do portal. A jornada não manipula window.history diretamente. */
  navigate(to: string): void;
  /** Rota interna atual, relativa a base da jornada. */
  path: string;
  /** Assina mudança de rota feita pelo shell (voltar do browser, deep link). */
  onPathChange(cb: (path: string) => void): () => void;
  /** Tema vigente. Muda em runtime; a jornada deve reagir. */
  theme: 'light' | 'dark';
  onThemeChange(cb: (theme: 'light' | 'dark') => void): () => void;
  /** Feature flags já resolvidas para este usuário. */
  flags: Record<string, boolean>;
  /** Notificação global (toast do shell). Consistência de UX entre jornadas. */
  notify(message: string, kind?: 'info' | 'success' | 'danger'): void;
  /**
   * Reporta uma falha IRRECUPERÁVEL da jornada (contrato v1.1).
   *
   * Necessário porque error boundary não atravessa fronteira de raiz React --
   * ver docs/adr/0007. Aditivo: jornadas v1.0 montam sem alteração.
   */
  fail(error: unknown): void;
}

/** A ausência de `registerSearchProvider` e deliberada -- ver docs/adr/0009. */

/* -------------------------------------------------------------------------- */
/* 3. O módulo que a jornada precisa exportar                                  */
/* -------------------------------------------------------------------------- */

export interface JourneyModule {
  /** Versão do contrato que a jornada implementa. O shell valida antes de montar. */
  contractVersion: `${number}.${number}`;
  /**
   * Monta a jornada no elemento dado.
   * Retorna a função de desmonte -- obrigatória, senão vazamos listeners
   * a cada troca de jornada (o portal é uma SPA de longa duração).
   */
  mount(container: HTMLElement, ctx: JourneyContext): Promise<JourneyUnmount> | JourneyUnmount;
}

export type JourneyUnmount = () => void;

/** Versão suportada pelo shell atual. */
export const SUPPORTED_CONTRACT_MAJOR = 1;
/** Versão que o shell IMPLEMENTA. Usada só para diagnóstico e telemetria. */
export const CONTRACT_VERSION = '1.1';

export function isContractCompatible(v: string | undefined): boolean {
  if (!v) return false;
  return Number.parseInt(v.split('.')[0], 10) === SUPPORTED_CONTRACT_MAJOR;
}
