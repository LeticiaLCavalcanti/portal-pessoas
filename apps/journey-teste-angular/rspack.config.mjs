/**
 * Config de build da jornada "teste-angular".
 *
 * Vale a pena comparar com `apps/journey-holerite/rspack.config.mjs`: a única
 * diferença é o nome da função importada. A squad declara identidade (id e
 * porta) e mais nada — trocar o framework não trouxe um segundo pipeline,
 * trouxe uma variante do caminho pavimentado que continua sendo do time de
 * plataforma. Ver docs/adr/0012.
 */
import { angularJourneyConfig } from '@portal/build-preset';

export default angularJourneyConfig({
  dir: import.meta.dirname,
  id: 'teste-angular',
  port: 5005
});
