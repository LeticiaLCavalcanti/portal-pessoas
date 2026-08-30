/**
 * ============================================================================
 *  @portal/build-preset -- o caminho pavimentado de build do portal
 * ============================================================================
 *
 * Por que um preset e não três rspack.config.js copiados:
 *
 *  1. A lista `shared` do Module Federation é o ÚNICO ponto onde 10 squads
 *     precisam concordar em tempo de build. Quando ela mora copiada em N
 *     configs, basta um time subir React 19 sozinho para colocar duas cópias
 *     de React na mesma página e quebrar hooks em produção. Aqui ela mora em
 *     UM lugar, versionado, com dono (plataforma).
 *
 *  2. O nome do container federado precisa bater exatamente com o `id` do
 *     manifesto no registro do BFF -- senão o shell registra "ponto" e o bundle
 *     se anuncia como "app". O preset deriva um do outro, então a classe
 *     inteira de erro deixa de existir.
 *
 *  3. Uma squad que precise divergir ainda pode: `journeyConfig()` devolve um
 *     objeto de configuração comum do Rspack, que o time é livre para estender.
 *     O preset é caminho pavimentado, não cerca.
 *
 * Por que Rspack (e não Vite) -- ver docs/adr/0006-rspack-como-bundler.md:
 * Module Federation é nativo do Rspack (mesma implementação de referência do
 * webpack, mantida pelo time do Module Federation), o que remove o plugin de
 * terceiros e faz federação funcionar também em `dev` -- com Vite, os remotes
 * só federavam depois de `build`, e o compartilhamento de singleton não valia
 * em desenvolvimento.
 */
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import { containerNameOf } from './container-name.mjs';

/* -------------------------------------------------------------------------- */
/* Governança: os singletons do portal                                         */
/* -------------------------------------------------------------------------- */

/**
 * Lista deliberadamente CURTA. Cada item aqui é um ponto de coordenação entre
 * todas as squads; cada item que sai daqui é uma duplicação de bytes no browser.
 *
 * `singleton: true`  -> uma única instância na página (obrigatório para React).
 * `strictVersion: false` -> divergência de patch degrada com aviso no console,
 *                           em vez de derrubar a jornada em runtime. A correção
 *                           e o PR do Renovate, não a tela branca do colaborador.
 */
export const SHARED_SINGLETONS = {
  react: { singleton: true, strictVersion: false, requiredVersion: '^18.3.1' },
  'react-dom': { singleton: true, strictVersion: false, requiredVersion: '^18.3.1' },
  '@portal/design-system': { singleton: true, strictVersion: false, requiredVersion: '^1.0.0' },
  /**
   * A barra no fim é SHARING POR PREFIXO, e ela existe por causa do DS v2.
   *
   * A chave sem barra compartilha exatamente `@portal/design-system`. Deep
   * import (`@portal/design-system/v2`) é outro especificador de módulo e NÃO
   * casa com ela -- sem esta linha, cada jornada que migrar para a v2 embutiria
   * a própria cópia da v2 no bundle, e o singleton do DS deixaria de ser um.
   *
   * `requiredVersion: '^1.1.0'` porque foi nessa versão que o subpath `/v2`
   * passou a existir. Com `strictVersion: false`, uma página que só tenha
   * bundles 1.0.0 no ar degrada com aviso no console em vez de derrubar a
   * jornada -- que é a mesma política das outras entradas desta lista.
   */
  '@portal/design-system/': { singleton: true, strictVersion: false, requiredVersion: '^1.1.0' },
  '@portal/tokens': { singleton: true, strictVersion: false, requiredVersion: '^1.0.0' }
};

// Reexportado de ./container-name.mjs, que o shell também importa em runtime.
export { containerNameOf } from './container-name.mjs';

/* -------------------------------------------------------------------------- */
/* Blocos comuns                                                               */
/* -------------------------------------------------------------------------- */

const swcLoaderReact = (dev) => ({
  test: /\.[cm]?[jt]sx?$/,
  exclude: /[\\/]node_modules[\\/]/,
  loader: 'builtin:swc-loader',
  options: {
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      transform: {
        react: { runtime: 'automatic', development: dev, refresh: dev }
      }
    }
  }
});

/**
 * Loader do Angular -- ver docs/adr/0012.
 *
 * Duas diferenças, e as duas importam:
 *
 *  1. `decorators: true` + `legacyDecorator: true`. Angular usa a semântica
 *     LEGADA de decorator (a do TypeScript pré-padrão), não a do estágio 3 que
 *     o swc aplica por padrão. Sem essas duas flags o bundle compila, sobe, e
 *     só falha em runtime -- com um `NG0906: is not a standalone component`
 *     que não tem nenhuma relação aparente com configuração de build.
 *
 *  2. `decoratorMetadata: true` emite os tipos dos parâmetros de construtor,
 *     que é o que a injeção de dependência do Angular lê. A jornada usa
 *     `inject()` e não depende disso, mas qualquer biblioteca Angular de
 *     terceiro que use `constructor(private x: Y)` depende -- e o custo de
 *     deixar ligado é alguns bytes de metadata.
 *
 * Não há `react-refresh` aqui: o HMR do Angular é outro mecanismo. Nesta
 * jornada o dev server recarrega a página inteira, que é o comportamento
 * padrão do Rspack sem plugin de refresh.
 */
const swcLoaderAngular = () => ({
  test: /\.[cm]?ts$/,
  exclude: /[\\/]node_modules[\\/]/,
  loader: 'builtin:swc-loader',
  options: {
    jsc: {
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
      target: 'es2022'
    }
  }
});

const baseConfig = ({
  dev, dir, entry, port, publicPath, htmlTemplate, htmlChunks,
  // O bloco que muda por framework. O resto desta função é idêntico para
  // React e Angular -- é isso que faz "outro framework" caber no caminho
  // pavimentado em vez de virar um segundo pipeline.
  loader = swcLoaderReact(dev), refresh = dev
}) => ({
  context: dir,
  mode: dev ? 'development' : 'production',
  devtool: dev ? 'cheap-module-source-map' : 'source-map',
  entry,
  output: {
    path: `${dir}/dist`,
    publicPath,
    clean: true,
    filename: dev ? '[name].js' : '[name].[contenthash:8].js',
    chunkFilename: dev ? 'chunk.[name].js' : 'chunk.[name].[contenthash:8].js',
    cssFilename: dev ? '[name].css' : '[name].[contenthash:8].css'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    // Os pacotes de plataforma são consumidos como FONTE (symlink do workspace).
    // Sem isto o Rspack resolveria o realpath e o `exclude: node_modules` do
    // swc-loader continuaria valendo -- que é exatamente o que queremos.
    symlinks: true
  },
  module: {
    rules: [
      loader,
      /**
       * CSS nativo do Rspack -- sem css-loader nem style-loader.
       *
       * A partir do Rspack 2 a regra é explícita (`experiments.css` foi
       * depreciado). `css/auto` trata `*.module.css` como CSS Modules e o
       * resto como CSS global, que é o que o DS precisa: ele pública classes
       * `ds-*` estáveis, propositalmente NÃO hasheadas, porque as jornadas
       * (e o legado, e um dia outro framework) dependem desses nomes.
       */
      { test: /\.css$/, type: 'css/auto' },
      { test: /\.(png|jpe?g|gif|svg)$/i, type: 'asset/resource' }
    ]
  },
  plugins: [
    htmlTemplate &&
      new rspack.HtmlRspackPlugin({ template: htmlTemplate, chunks: htmlChunks, inject: 'body' }),
    refresh && new ReactRefreshRspackPlugin()
  ].filter(Boolean),
  optimization: {
    // Module Federation exige runtime único: nada de runtimeChunk separado.
    runtimeChunk: false,
    // Chunk de vendor separado ajuda o cache do CDN entre versões da jornada.
    splitChunks: dev ? false : { chunks: 'async', cacheGroups: { defaultVendors: false } }
  },
  devServer: {
    port,
    hot: true,
    // Federação é cross-origin por definição: o shell (5173) baixa o
    // remoteEntry da jornada (5001..500N). Sem CORS aqui, o `dev` não federa.
    headers: { 'Access-Control-Allow-Origin': '*' },
    client: { overlay: { runtimeErrors: false } }
  },
  infrastructureLogging: { level: 'warn' },
  stats: 'errors-warnings'
});

/* -------------------------------------------------------------------------- */
/* 1. Shell (host)                                                             */
/* -------------------------------------------------------------------------- */

/**
 * O host NÃO declara remotes.
 *
 * `remotes: {}` deixa o runtime de federação disponível, mas a lista real de
 * jornadas chega do registro do BFF em runtime, via `registerRemotes()`.
 * É isso que faz "publicar jornada nova sem alterar o core" ser literal:
 * nenhuma jornada aparece neste arquivo, hoje nem nunca.
 */
export function shellConfig({ dir, port = 5173, dev = process.env.NODE_ENV !== 'production' }) {
  const cfg = baseConfig({
    dev,
    dir,
    entry: { main: './src/main.tsx' },
    port,
    publicPath: '/',
    htmlTemplate: `${dir}/index.html`,
    htmlChunks: ['main']
  });

  cfg.output.uniqueName = 'shell';
  cfg.plugins.push(
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {},
      shared: SHARED_SINGLETONS,
      // O host não expõe nada, então não há tipo para gerar nem para consumir:
      // o plugin de DTS só subiria um servidor a mais é ruído a mais no log.
      dts: false
    })
  );

  // BrowserRouter: /beneficios/vr precisa devolver o index.html no F5.
  cfg.devServer.historyApiFallback = true;
  return cfg;
}

/* -------------------------------------------------------------------------- */
/* 2. Jornada (remote)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Uma jornada expõe UM módulo: `./journey`, que satisfaz `JourneyModule`.
 * Tudo o mais é privado da squad.
 *
 * `publicPath` absoluto é obrigatório: os chunks precisam ser resolvidos a
 * partir da ORIGEM da jornada, não da origem do shell. Em produção vem do CDN,
 * injetado por variável de ambiente no pipeline da própria squad.
 */
export function journeyConfig({
  dir,
  id,
  port,
  dev = process.env.NODE_ENV !== 'production',
  publicPath = process.env.JOURNEY_PUBLIC_PATH ?? `http://localhost:${port}/`
}) {
  const cfg = baseConfig({
    dev,
    dir,
    // `standalone` é o harness de desenvolvimento isolado da squad: rodar a
    // jornada sozinha, sem shell, sem BFF e sem as outras 9 jornadas.
    entry: { standalone: './src/standalone.tsx' },
    port,
    publicPath,
    htmlTemplate: `${dir}/index.html`,
    htmlChunks: ['standalone']
  });

  const name = containerNameOf(id);
  cfg.output.uniqueName = name;
  cfg.plugins.push(
    new ModuleFederationPlugin({
      name,
      filename: 'remoteEntry.js',
      exposes: { './journey': './src/journey.tsx' },
      shared: SHARED_SINGLETONS,
      // O manifesto do MF não substitui o registro do BFF: ele é o artefato de
      // build (o que ESTE bundle expõe e compartilha). O registro é o artefato
      // de operação (qual versão está no ar para quem). Papéis diferentes.
      dts: false
    })
  );

  return cfg;
}

/* -------------------------------------------------------------------------- */
/* 3. Jornada em Angular (remote) — teste de implementação                     */
/* -------------------------------------------------------------------------- */

/**
 * Mesma fronteira, outro framework. Ver docs/adr/0012.
 *
 * O que esta função PRECISA fazer diferente de `journeyConfig` cabe em três
 * linhas — loader, `shared` e `ngDevMode`. Todo o resto (nome do container
 * derivado do id, `publicPath` absoluto, CORS no dev server, `remoteEntry.js`,
 * chunk de vendor) é o mesmo, porque a fronteira do portal é o CONTRATO, não o
 * framework.
 *
 * `shared: {}` é a decisão mais consequente daqui, e é deliberada:
 *
 *  - React, react-dom e o DS não entram: esta jornada não os importa. Declarar
 *    um singleton que o grafo não contém não "reserva" nada — só coloca uma
 *    entrada morta no manifesto do container.
 *  - Angular também NÃO é compartilhado. Compartilhar exige que dois ou mais
 *    bundles concordem numa faixa de versão, e hoje só existe UM consumidor de
 *    Angular no portal. Compartilhar agora seria pagar o custo de coordenação
 *    (a squad não sobe de major sozinha) por um benefício de zero byte.
 *    A regra: um pacote entra em `SHARED_SINGLETONS` quando tem o SEGUNDO
 *    consumidor, não quando tem o primeiro.
 *
 * O preço está medido e assumido: o Angular inteiro — incluindo o compilador
 * JIT — viaja no bundle desta jornada. O número real está na própria tela da
 * jornada e na ADR 0012.
 */
export function angularJourneyConfig({
  dir,
  id,
  port,
  dev = process.env.NODE_ENV !== 'production',
  /**
   * `'auto'` em vez da URL absoluta que `journeyConfig` usa: o Rspack resolve o
   * endereço dos chunks em runtime, a partir do `src` do próprio remoteEntry.
   *
   * É o que torna o artefato PORTÁVEL -- os mesmos bytes servem de
   * `localhost:5005`, do preview de um PR e do CDN de produção, sem rebuild.
   * Foi requisito prático aqui: esta jornada é publicada em produção num
   * endereço que só se conhece DEPOIS do deploy, então não havia como embutir a
   * URL no bundle. Ver docs/02-build-e-deploy.md.
   */
  publicPath = process.env.JOURNEY_PUBLIC_PATH ?? 'auto'
}) {
  const cfg = baseConfig({
    dev,
    dir,
    entry: { standalone: './src/standalone.ts' },
    port,
    publicPath,
    htmlTemplate: `${dir}/index.html`,
    htmlChunks: ['standalone'],
    loader: swcLoaderAngular(),
    refresh: false
  });

  const name = containerNameOf(id);
  cfg.output.uniqueName = name;
  cfg.plugins.push(
    /**
     * `ngJitMode: true` é explícito de propósito. O padrão do Angular já é
     * ligado, mas esta jornada DEPENDE de JIT (compila os templates no
     * browser, com `@angular/compiler` dentro do bundle). Deixar implícito é
     * deixar uma dependência crítica invisível para quem mexer no build depois.
     *
     * `ngDevMode: false` só em produção, e só lá: ele remove as asserções e as
     * mensagens de erro longas do Angular. Não é micro-otimização -- é a
     * diferença entre enviar ou não o modo de desenvolvimento do framework
     * para o colaborador. Em `dev` a constante NÃO é definida, para o Angular
     * seguir instalando o próprio `ngDevMode` e as mensagens continuarem
     * legíveis para a squad.
     */
    new rspack.DefinePlugin(
      dev ? { ngJitMode: 'true' } : { ngJitMode: 'true', ngDevMode: 'false' }
    ),
    new ModuleFederationPlugin({
      name,
      filename: 'remoteEntry.js',
      exposes: { './journey': './src/journey.ts' },
      shared: {},
      dts: false
    })
  );

  return cfg;
}
