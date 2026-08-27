/**
 * Carregamento de microfrontends em runtime -- o unico arquivo do shell que
 * conhece Module Federation.
 *
 * Decisoes: docs/adr/0001 (remotes em runtime) e docs/adr/0006 (Rspack).
 *
 * Invariantes desta implementacao:
 *  - a chave de cache e `id@versao`, entao subir versao invalida o cache;
 *  - falha nao fica em cache -- "tentar de novo" vai na rede;
 *  - `loadRemote` nao tem orcamento de tempo proprio, dai o `withTimeout`.
 */
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { containerNameOf } from '@portal/build-preset/container-name';
import type { JourneyModule } from '@portal/journey-contract';

const cache = new Map<string, Promise<JourneyModule>>();

/**
 * Traducao de falha tecnica para frase de colaborador -- ver docs/adr/0001,
 * "Consequencias". A mensagem original vai inteira para a telemetria.
 */
function mensagemParaColaborador(erro: unknown, jornada: string): string {
  const bruta = erro instanceof Error ? erro.message : String(erro);

  if (bruta.includes('RUNTIME-008') || bruta.includes('Failed to load script'))
    return `A jornada "${jornada}" não respondeu. O time responsável já foi avisado.`;
  if (bruta.includes('RUNTIME-002') || bruta.includes('does not contain'))
    return `A jornada "${jornada}" foi publicada num formato que este portal não reconhece.`;
  if (bruta.startsWith('Tempo esgotado'))
    return `A jornada "${jornada}" demorou demais para abrir.`;
  if (bruta.includes('não exporta mount'))
    return bruta;

  // Falha desconhecida: nao inventamos diagnostico, so evitamos despejar stack.
  return `Não foi possível abrir a jornada "${jornada}".`;
}

/** Erro de jornada: frase curta na tela, detalhe tecnico preservado em `causa`. */
export class JourneyLoadError extends Error {
  constructor(readonly causa: unknown, jornada: string) {
    super(mensagemParaColaborador(causa, jornada));
    this.name = 'JourneyLoadError';
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Tempo esgotado ao carregar ${label} (${ms}ms)`)),
      ms
    );
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
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
      // `force: true` re-registra o mesmo container em outra URL: e o que
      // torna o rollback instantaneo (docs/adr/0001).
      registerRemotes(
        [{
          name: container,
          entry: opts.entry,
          // NAO trocar para 'module': falha com RUNTIME-002, que parece
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
    })().catch((e) => {
      throw new JourneyLoadError(e, opts.id);
    }),
    opts.timeoutMs,
    opts.id
  ).catch((e) => {
    // O timeout dispara fora da promise interna, entao a traducao vem aqui.
    throw e instanceof JourneyLoadError ? e : new JourneyLoadError(e, opts.id);
  });

  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}
