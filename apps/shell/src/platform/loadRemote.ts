/**
 * ============================================================================
 *  Carregamento de microfrontends em RUNTIME
 * ============================================================================
 *
 * O shell nunca importa uma jornada em tempo de build. Ele recebe a URL do
 * `remoteEntry` do registro do BFF e registra o remote aqui, ja com a pagina
 * no ar. Publicar uma jornada nova nao gera commit, build nem deploy do shell.
 *
 * Isto usa o runtime OFICIAL do Module Federation (`@module-federation/enhanced
 * /runtime`), que e a mesma implementacao que o `ModuleFederationPlugin` do
 * Rspack injeta no bundle -- ou seja, `registerRemotes` e `loadRemote` falam
 * com o mesmo registro de shared/singletons que o build montou.
 *
 * Antes disto o projeto dependia do modulo virtual `__federation__` do
 * `@originjs/vite-plugin-federation`, uma API nao documentada de um plugin de
 * terceiros. Ver docs/adr/0006-rspack-como-bundler.md.
 *
 * Cuidados que costumam faltar em POCs de Module Federation e que estao aqui:
 *  - TIMEOUT: um remote fora do ar nao pode deixar a jornada carregando pra
 *    sempre. `loadRemote` sozinho nao tem orcamento de tempo.
 *  - CACHE POR VERSAO: a chave e `id@versao`, entao subir uma versao nova
 *    invalida o cache sozinha, sem hard refresh no colaborador.
 *  - FALHA NAO FICA EM CACHE: "tentar de novo" precisa ir na rede.
 */
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import { containerNameOf } from '@portal/build-preset/container-name';
import type { JourneyModule } from '@portal/journey-contract';

const cache = new Map<string, Promise<JourneyModule>>();

/**
 * Traducao de falha tecnica para frase de colaborador.
 *
 * O runtime do Module Federation devolve coisas como
 * `[Federation Runtime]: Failed to load script resources. #RUNTIME-008 args:
 * {...} View the docs to see how to solve: https://module-federation.io/...`.
 *
 * Isso e texto para quem mantem o portal, e estava indo direto para a tela de
 * quarenta mil pessoas -- com um link para a documentacao de um bundler. A
 * mensagem tecnica continua existindo: ela vai INTEIRA para a telemetria, com
 * jornada, squad, versao e correlation-id. O que muda e quem le cada uma.
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
      /**
       * `force: true` permite re-registrar o MESMO container apontando para
       * outra URL. E o que torna rollback instantaneo: a squad muda a versao no
       * registro, o colaborador recarrega e passa a baixar outro bundle, sem
       * deploy do shell.
       */
      registerRemotes(
        [{
          name: container,
          entry: opts.entry,
          /**
           * `global`: o remoteEntry e um container classico (`var ponto = ...`)
           * carregado por tag <script>, que e o formato que o
           * ModuleFederationPlugin do Rspack emite por padrao.
           *
           * Nao e detalhe cosmetico: com `module` o runtime tentaria um
           * `import()` do arquivo e falharia com RUNTIME-002 ("does not
           * contain init") -- um erro que se parece com "a jornada esta fora
           * do ar" e manda a squad errada investigar.
           *
           * Alternativa considerada: registrar pelo `mf-manifest.json` em vez
           * do remoteEntry. Da preload de shared e dispensa este campo, mas
           * acrescenta um segundo artefato ao contrato de publicacao das 10
           * squads. Fica para quando o custo de carregamento justificar.
           */
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
