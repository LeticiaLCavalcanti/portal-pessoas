/**
 * ============================================================================
 *  @portal/build-preset -- o caminho pavimentado de build do portal
 * ============================================================================
 *
 * Por que um preset e nao tres rspack.config.js copiados:
 *
 *  1. A lista `shared` do Module Federation e o UNICO ponto onde 10 squads
 *     precisam concordar em tempo de build. Quando ela mora copiada em N
 *     configs, basta um time subir React 19 sozinho para colocar duas copias
 *     de React na mesma pagina e quebrar hooks em producao. Aqui ela mora em
 *     UM lugar, versionado, com dono (plataforma).
 *
 *  2. O nome do container federado precisa bater exatamente com o `id` do
 *     manifesto no registro do BFF -- senao o shell registra "ponto" e o bundle
 *     se anuncia como "app". O preset deriva um do outro, entao a classe
 *     inteira de erro deixa de existir.
 *
 *  3. Uma squad que precise divergir ainda pode: `journeyConfig()` devolve um
 *     objeto de configuracao comum do Rspack, que o time e livre para estender.
 *     O preset e caminho pavimentado, nao cerca.
 *
 * Por que Rspack (e nao Vite) -- ver docs/adr/0006-rspack-como-bundler.md:
 * Module Federation e nativo do Rspack (mesma implementacao de referencia do
 * webpack, mantida pelo time do Module Federation), o que remove o plugin de
 * terceiros e faz federacao funcionar tambem em `dev` -- com Vite, os remotes
 * so federavam depois de `build`, e o compartilhamento de singleton nao valia
 * em desenvolvimento.
 */
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import { containerNameOf } from './container-name.mjs';

/* -------------------------------------------------------------------------- */
/* Governanca: os singletons do portal                                         */
/* -------------------------------------------------------------------------- */

/**
 * Lista deliberadamente CURTA. Cada item aqui e um ponto de coordenacao entre
 * todas as squads; cada item que sai daqui e uma duplicacao de bytes no browser.
 *
 * `singleton: true`  -> uma unica instancia na pagina (obrigatorio para React).
 * `strictVersion: false` -> divergencia de patch degrada com aviso no console,
 *                           em vez de derrubar a jornada em runtime. A correcao
 *                           e o PR do Renovate, nao a tela branca do colaborador.
 */
export const SHARED_SINGLETONS = {
  react: { singleton: true, strictVersion: false, requiredVersion: '^18.3.1' },
  'react-dom': { singleton: true, strictVersion: false, requiredVersion: '^18.3.1' },
  '@portal/design-system': { singleton: true, strictVersion: false, requiredVersion: '^1.0.0' },
  '@portal/tokens': { singleton: true, strictVersion: false, requiredVersion: '^1.0.0' }
};

// Reexportado de ./container-name.mjs, que o shell tambem importa em runtime.
export { containerNameOf } from './container-name.mjs';

/* -------------------------------------------------------------------------- */
/* Blocos comuns                                                               */
/* -------------------------------------------------------------------------- */

const swcLoader = (dev) => ({
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

const baseConfig = ({ dev, dir, entry, port, publicPath, htmlTemplate, htmlChunks }) => ({
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
    // Os pacotes de plataforma sao consumidos como FONTE (symlink do workspace).
    // Sem isto o Rspack resolveria o realpath e o `exclude: node_modules` do
    // swc-loader continuaria valendo -- que e exatamente o que queremos.
    symlinks: true
  },
  module: {
    rules: [
      swcLoader(dev),
      /**
       * CSS nativo do Rspack -- sem css-loader nem style-loader.
       *
       * A partir do Rspack 2 a regra e explicita (`experiments.css` foi
       * depreciado). `css/auto` trata `*.module.css` como CSS Modules e o
       * resto como CSS global, que e o que o DS precisa: ele publica classes
       * `ds-*` estaveis, propositalmente NAO hasheadas, porque as jornadas
       * (e o legado, e um dia outro framework) dependem desses nomes.
       */
      { test: /\.css$/, type: 'css/auto' },
      { test: /\.(png|jpe?g|gif|svg)$/i, type: 'asset/resource' }
    ]
  },
  plugins: [
    htmlTemplate &&
      new rspack.HtmlRspackPlugin({ template: htmlTemplate, chunks: htmlChunks, inject: 'body' }),
    dev && new ReactRefreshRspackPlugin()
  ].filter(Boolean),
  optimization: {
    // Module Federation exige runtime unico: nada de runtimeChunk separado.
    runtimeChunk: false,
    // Chunk de vendor separado ajuda o cache do CDN entre versoes da jornada.
    splitChunks: dev ? false : { chunks: 'async', cacheGroups: { defaultVendors: false } }
  },
  devServer: {
    port,
    hot: true,
    // Federacao e cross-origin por definicao: o shell (5173) baixa o
    // remoteEntry da jornada (5001..500N). Sem CORS aqui, o `dev` nao federa.
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
 * O host NAO declara remotes.
 *
 * `remotes: {}` deixa o runtime de federacao disponivel, mas a lista real de
 * jornadas chega do registro do BFF em runtime, via `registerRemotes()`.
 * E isso que faz "publicar jornada nova sem alterar o core" ser literal:
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
      // O host nao expoe nada, entao nao ha tipo para gerar nem para consumir:
      // o plugin de DTS so subiria um servidor a mais e ruido a mais no log.
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
 * Uma jornada expoe UM modulo: `./journey`, que satisfaz `JourneyModule`.
 * Tudo o mais e privado da squad.
 *
 * `publicPath` absoluto e obrigatorio: os chunks precisam ser resolvidos a
 * partir da ORIGEM da jornada, nao da origem do shell. Em producao vem do CDN,
 * injetado por variavel de ambiente no pipeline da propria squad.
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
    // `standalone` e o harness de desenvolvimento isolado da squad: rodar a
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
      // O manifesto do MF nao substitui o registro do BFF: ele e o artefato de
      // build (o que ESTE bundle expoe e compartilha). O registro e o artefato
      // de operacao (qual versao esta no ar para quem). Papeis diferentes.
      dts: false
    })
  );

  return cfg;
}
