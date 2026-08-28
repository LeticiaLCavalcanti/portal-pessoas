/**
 * ============================================================================
 *  @portal/design-system/v2 — superfície pública da v2
 * ============================================================================
 *
 * Mesmo PACOTE da v1, subpath diferente. Isso não é detalhe de empacotamento,
 * é a decisão que faz a migração ser gradual (ADR 0011):
 *
 *  - No Module Federation, `@portal/design-system` é singleton. Publicar a v2
 *    como `@portal/design-system-v2` criaria um SEGUNDO singleton para as 10
 *    squads negociarem, e uma jornada em v1 numa página com outra em v2 passaria
 *    a baixar dois pacotes de DS. No mesmo pacote, a página carrega uma cópia
 *    só, que contém as duas versões.
 *  - A v2 sai como MINOR (1.0.0 -> 1.1.0), porque a v1 não perdeu nada. O
 *    `requiredVersion: '^1.0.0'` do preset continua satisfeito, então nenhuma
 *    jornada precisa de rebuild para o portal seguir funcionando.
 *
 * ---------------------------------------------------------------------------
 *  Como uma squad migra
 * ---------------------------------------------------------------------------
 *
 *  Passo 1 — trocar UMA linha de import, no arquivo que ela quiser:
 *
 *      - import { Button, Card, Badge } from '@portal/design-system';
 *      + import { Button, Card, Badge } from '@portal/design-system/v2';
 *
 *    Nada mais muda. As props da v1 continuam compilando e continuam
 *    funcionando, traduzidas pela ponte em ./primitives.tsx, com um aviso de
 *    depreciação no console de desenvolvimento.
 *
 *  Passo 2 — trocar as props no ritmo da squad, guiada pelos avisos.
 *
 *  Passo 3 — nada. Não existe passo 3: a jornada já está na v2.
 *
 *  Os dois passos podem estar a sprints de distância, e podem conviver no mesmo
 *  arquivo. É o que a jornada de holerite faz hoje: `Detail` está em v2,
 *  `Screen` e `IncomeStatement` seguem em v1, e as duas telas são indistinguíveis.
 *
 * ---------------------------------------------------------------------------
 *  Por que este arquivo reexporta metade da v1
 * ---------------------------------------------------------------------------
 *
 *  Porque a alternativa é pior. Se `Stack` não existisse aqui, migrar um
 *  arquivo exigiria DOIS imports e a squad teria de saber de cor quais
 *  componentes já têm v2 -- conhecimento que não está no código e que envelhece
 *  a cada release do DS. Reexportando, `/v2` é sempre a superfície COMPLETA do
 *  DS: o que tem v2 vem em v2, o que não tem vem em v1, e a squad não precisa
 *  saber a diferença.
 *
 *  Quando um desses ganhar v2, a linha sai daqui e entra na lista de cima --
 *  sem que nenhum ponto de uso mude de import.
 */

/* -------------------------------------------------------------------------- */
/* Componentes que JÁ são v2                                                   */
/* -------------------------------------------------------------------------- */

export {
  Button,
  Badge,
  type ButtonProps,
  type ButtonVariant,
  type ButtonTone,
  type BadgeProps,
  type BadgeTone
} from './primitives';

export { Card, DataList, type CardProps, type DataListItem } from './patterns';

/* -------------------------------------------------------------------------- */
/* Ainda sem v2 — reexportados da v1, sem alteração nenhuma                    */
/* -------------------------------------------------------------------------- */

export {
  Stack,
  Row,
  Text,
  Skeleton,
  Field,
  ErrorBoundary,
  Icon,
  iconNames,
  type IconName,
  EmptyState,
  Brand,
  Tabs,
  type TabItem
} from '../index';

/* -------------------------------------------------------------------------- */
/* Escotilha de saída                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A v1 inteira, para o arquivo que precisa dos dois ao mesmo tempo -- comparar
 * lado a lado durante a migração, ou segurar um ponto de uso na v1 porque
 * depende de um detalhe que a v2 mudou.
 *
 *     import { Button, v1 } from '@portal/design-system/v2';
 *     <v1.Button variant="primary">…</v1.Button>
 *
 * Existir explicitamente é melhor do que a squad descobrir sozinha que pode
 * importar dos dois caminhos: assim o uso aparece no grep de adoção do DS.
 */
export * as v1 from '../index';

/**
 * Versão da superfície, para depuração e para o dashboard de adoção do DS.
 * Não é a versão do pacote npm -- é qual API o ponto de uso está falando.
 */
export const DS_SURFACE = 'v2' as const;
