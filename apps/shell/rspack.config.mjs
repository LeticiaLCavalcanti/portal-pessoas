/**
 * Config de build do shell (host).
 *
 * Repare no que NÃO está aqui: nenhuma jornada. Nenhum `remotes: { ponto: ... }`.
 * O host só declara os singletons; a lista de jornadas chega do registro do BFF
 * em runtime. Publicar uma jornada nova não muda este arquivo.
 */
import { shellConfig } from '@portal/build-preset';

export default shellConfig({
  dir: import.meta.dirname,
  port: 5173
});
