/**
 * Carregamento de microfrontends em runtime -- o único arquivo do shell que
 * conhece Module Federation.
 *
 * Decisões: docs/adr/0001 (remotes em runtime) e docs/adr/0006 (Rspack).
 *
 * Invariantes desta implementação:
 *  - a chave de cache é `id@versao`, então subir versão inválida o cache;
 *  - falha não fica em cache -- "tentar de novo" vai na rede;
 *  - `loadRemote` não tem orçamento de tempo próprio, daí o `withTimeout`.
 */
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { containerNameOf } from '@portal/build-preset/container-name';
import type { JourneyModule } from '@portal/journey-contract';

const cache = new Map<string, Promise<JourneyModule>>();

/**
 * Tradução de falha técnica para frase de colaborador -- ver docs/adr/0001,
 * "Consequências". A mensagem original vai inteira para a telemetria.
 */
function employeeFacingMessage(error: unknown, journeyName: string): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw.includes('RUNTIME-008') || raw.includes('Failed to load script'))
    return `A jornada "${journeyName}" não respondeu. O time responsável já foi avisado.`;
  if (raw.includes('RUNTIME-002') || raw.includes('does not contain'))
    return `A jornada "${journeyName}" foi publicada num formato que este portal não reconhece.`;
  if (raw.startsWith('Tempo esgotado'))
    return `A jornada "${journeyName}" demorou demais para abrir.`;
  if (raw.includes('não exporta mount'))
    return raw;

  // Falha desconhecida: não inventamos diagnóstico, só evitamos despejar stack.
  return `Não foi possível abrir a jornada "${journeyName}".`;
}

/** Erro de jornada: frase curta na tela, detalhe técnico preservado em `cause`. */
export class JourneyLoadError extends Error {
  constructor(readonly cause: unknown, journeyName: string) {
    super(employeeFacingMessage(cause, journeyName));
    this.name = 'JourneyLoadError';
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Tempo esgotado ao carregar ${label} (${ms}ms)`)),
      ms
    );
    p.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

export function loadJourneyModule(opts: {
  id: string;
  version: string;
  entry: string;
  exposedModule: string;
  timeoutMs: number;
}): Promise<JourneyModule> {
  const key = `${opts.id}@${opts.version}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const container = containerNameOf(opts.id);

  const promise = withTimeout(
    (async () => {
      // `force: true` re-registra o mesmo container em outra URL: é o que
      // torna o rollback instantâneo (docs/adr/0001).
      registerRemotes(
        [{
          name: container,
          entry: opts.entry,
          // NÃO trocar para 'module': falha com RUNTIME-002, que parece
          // "jornada fora do ar". Ver docs/adr/0006, "Negativas".
          type: 'global'
        }],
        { force: true }
      );

      // `./journey` no manifesto -> `ponto/journey` no runtime do MF.
      const exposedPath = opts.exposedModule.replace(/^\.\//, '');
      const mod = await loadRemote<{ default?: JourneyModule } & JourneyModule>(
        `${container}/${exposedPath}`
      );

      const journey = (mod?.default ?? mod) as JourneyModule | undefined;
      if (typeof journey?.mount !== 'function') {
        throw new Error(`A jornada "${opts.id}" não exporta mount(). Contrato quebrado.`);
      }
      return journey;
    })().catch((error) => {
      throw new JourneyLoadError(error, opts.id);
    }),
    opts.timeoutMs,
    opts.id
  ).catch((error) => {
    // O timeout dispara fora da promise interna, então a tradução vem aqui.
    throw error instanceof JourneyLoadError ? error : new JourneyLoadError(error, opts.id);
  });

  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}
