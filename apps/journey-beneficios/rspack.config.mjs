/**
 * Config de build da jornada "beneficios".
 *
 * Toda a complexidade (Module Federation, singletons, swc, dev server com CORS)
 * mora em `@portal/build-preset`, que é do time de plataforma. O que a squad
 * declara é só a sua identidade: id da jornada e porta de desenvolvimento.
 */
import { journeyConfig } from '@portal/build-preset';

export default journeyConfig({
  dir: import.meta.dirname,
  id: 'beneficios',
  port: 5002
});
