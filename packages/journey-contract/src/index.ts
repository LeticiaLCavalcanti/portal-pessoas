/**
 * ============================================================================
 *  CONTRATO SHELL <-> JORNADA
 * ============================================================================
 *
 * Unico ponto de acoplamento entre o shell e as ~10 squads. Deliberadamente
 * pequeno, agnostico de framework e versionado por SemVer independente.
 *
 * Decisao e trade-offs: docs/adr/0002.
 * Estado do contrato (1.0 -> 1.1): tabela ao final da docs/adr/0002.
 */
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* 1. Manifesto: como o shell descobre uma jornada em runtime                  */
/* -------------------------------------------------------------------------- */

export const journeyKind = z.enum([
  'remote', // microfrontend moderno carregado via Module Federation
  'legacy', // plataforma legada embarcada em iframe/WebView com ponte
  'native'  // jornada que so existe no app (biometria, camera, GPS)
]);

export const rolloutSchema = z.object({
  enabled: z.boolean(),
  /** % de colaboradores que veem a versao moderna. O resto cai no fallback. */
  percentage: z.number().min(0).max(100),
  /** Grupos que sempre veem (canary interno). */
  allowlist: z.array(z.string()).default([]),
  /** Jornada legada equivalente, usada como fallback de rollout E de falha. */
  fallbackJourneyId: z.string().optional()
});

export const journeyManifestSchema = z.object({
  /**
   * Id da jornada. E tambem a chave do container de Module Federation:
   * `@portal/build-preset` deriva o nome do container do id (kebab -> snake),
   * dos dois lados. Nao ha um segundo nome para manter em sincronia.
   */
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  description: z.string().default(''),
  /**
   * NOME semantico do icone (`clock`, `gift`, `receipt`), resolvido pelo
   * Design System -- nunca um glifo, um caractere ou uma URL de imagem.
   *
   * `string` livre e nao enum, de proposito -- ver docs/adr/0008.
   */
  icon: z.string().default('*'),
  /** Dominio de negocio. Define ownership e agrupamento no catalogo. */
  domain: z.string(),
  /** Squad dona. Vira tag em todo evento de telemetria e alvo do alerta. */
  squad: z.string(),
  kind: journeyKind,
  /** SemVer do bundle publicado. O shell nunca depende de "latest". */
  version: z.string(),
  /** Rota que o shell reserva para a jornada. Ela e dona de tudo abaixo dela. */
  route: z.string().startsWith('/'),
  /** URL do remoteEntry (kind=remote) ou da pagina legada (kind=legacy). */
  entry: z.string().url(),
  /** Modulo exposto no Module Federation. Ex: './journey' */
  exposedModule: z.string().default('./journey'),
  /** Jornadas de fallback nao aparecem no catalogo -- evita item duplicado. */
  showInCatalog: z.boolean().default(true),
  /** Permissoes exigidas. O BFF ja filtra, o shell so nao renderiza no menu. */
  requiredRoles: z.array(z.string()).default([]),
  /** Recursos que a jornada oferece ao portal (ex.: indexar na busca global). */
  capabilities: z.array(z.enum(['search', 'home-widget', 'notifications'])).default([]),
  rollout: rolloutSchema,
  /** Orcamento de carregamento. Estourou = alerta pro time dono, nao pro shell. */
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
  /** Sessao ja resolvida pelo shell. A jornada NUNCA faz login. */
  user: JourneyUser;
  /** Cliente HTTP para o BFF, ja com token, correlation-id e tag da jornada. */
  http: JourneyHttp;
  /** Telemetria pre-marcada com journeyId/squad/version. */
  telemetry: JourneyTelemetry;
  /** Navegacao do portal. A jornada nao manipula window.history diretamente. */
  navigate(to: string): void;
  /** Rota interna atual, relativa a base da jornada. */
  path: string;
  /** Assina mudanca de rota feita pelo shell (voltar do browser, deep link). */
  onPathChange(cb: (path: string) => void): () => void;
  /** Tema vigente. Muda em runtime; a jornada deve reagir. */
  theme: 'light' | 'dark';
  onThemeChange(cb: (theme: 'light' | 'dark') => void): () => void;
  /** Feature flags ja resolvidas para este usuario. */
  flags: Record<string, boolean>;
  /** Notificacao global (toast do shell). Consistencia de UX entre jornadas. */
  notify(message: string, kind?: 'info' | 'success' | 'danger'): void;
  /**
   * Reporta uma falha IRRECUPERAVEL da jornada (contrato v1.1).
   *
   * Necessario porque error boundary nao atravessa fronteira de raiz React --
   * ver docs/adr/0007. Aditivo: jornadas v1.0 montam sem alteracao.
   */
  fail(error: unknown): void;
}

/** A ausencia de `registerSearchProvider` e deliberada -- ver docs/adr/0009. */

/* -------------------------------------------------------------------------- */
/* 3. O modulo que a jornada precisa exportar                                  */
/* -------------------------------------------------------------------------- */

export interface JourneyModule {
  /** Versao do contrato que a jornada implementa. O shell valida antes de montar. */
  contractVersion: `${number}.${number}`;
  /**
   * Monta a jornada no elemento dado.
   * Retorna a funcao de desmonte -- obrigatoria, senao vazamos listeners
   * a cada troca de jornada (o portal e uma SPA de longa duracao).
   */
  mount(container: HTMLElement, ctx: JourneyContext): Promise<JourneyUnmount> | JourneyUnmount;
}

export type JourneyUnmount = () => void;

/** Versao suportada pelo shell atual. */
export const SUPPORTED_CONTRACT_MAJOR = 1;
/** Versao que o shell IMPLEMENTA. Usada so para diagnostico e telemetria. */
export const CONTRACT_VERSION = '1.1';

export function isContractCompatible(v: string | undefined): boolean {
  if (!v) return false;
  return Number.parseInt(v.split('.')[0], 10) === SUPPORTED_CONTRACT_MAJOR;
}
