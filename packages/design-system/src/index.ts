/**
 * @portal/design-system (web)
 *
 * Camadas:
 *   L0 tokens      -> @portal/tokens          (compartilhado com o app nativo)
 *   L1 primitivos  -> ./primitives            (sem negócio)
 *   L2 composições -> ./patterns              (sem negócio, com opinião de layout)
 *   L3 negócio     -> NÃO MORA AQUI. Fica em @portal/<domínio>-ui, dono = a squad.
 *
 * Motivo do corte em L3: componente de negócio muda no ritmo do produto e tem
 * dono claro. Se entrar no DS, a squad de plataforma vira gargalo de todo mundo.
 */
export * from './primitives';
export * from './patterns';
