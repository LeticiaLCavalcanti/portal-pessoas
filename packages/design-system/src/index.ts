/**
 * @portal/design-system (web)
 *
 * Camadas:
 *   L0 tokens      -> @portal/tokens          (compartilhado com o app nativo)
 *   L1 primitivos  -> ./primitives            (sem negocio)
 *   L2 composicoes -> ./patterns              (sem negocio, com opiniao de layout)
 *   L3 negocio     -> NAO MORA AQUI. Fica em @portal/<dominio>-ui, dono = a squad.
 *
 * Motivo do corte em L3: componente de negocio muda no ritmo do produto e tem
 * dono claro. Se entrar no DS, a squad de plataforma vira gargalo de todo mundo.
 */
export * from './primitives';
export * from './patterns';
