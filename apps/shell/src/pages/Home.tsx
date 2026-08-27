/**
 * Home personalizada.
 *
 * Decisao: a home e composta pelo BFF, nao pelo shell.
 * O shell recebe uma lista de cards ja priorizada e apenas renderiza. Se a
 * personalizacao morasse no shell, toda regra nova de negocio ("mostrar aviso
 * de ferias vencendo") viraria deploy do core -- exatamente o acoplamento que
 * a arquitetura tenta evitar.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Row, Skeleton, Stack, Text } from '@portal/design-system';
import { usePortal } from '../platform/portal';

interface HomeCard { id: string; journeyId: string; kind: string; title: string; cta: string; route: string }

export function Home() {
  const portal = usePortal();
  const navigate = useNavigate();
  const [data, setData] = React.useState<{ greeting: string; cards: HomeCard[] } | null>(null);

  React.useEffect(() => {
    portal.http.get<{ greeting: string; cards: HomeCard[] }>('/v1/home').then(setData).catch(() => undefined);
  }, [portal.http]);

  if (!data) return <Stack gap={4}><Skeleton h={40} w="40%" /><Skeleton h={120} /></Stack>;

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Text size="xxl" as="h1">{data.greeting}</Text>
        <Text tone="muted" size="sm">
          Matrícula {portal.user?.registration} · {portal.user?.area}
        </Text>
      </Stack>

      <div className="pp-grid">
        {data.cards.map((c) => {
          const j = portal.journeyById(c.journeyId);
          return (
            <Card
              key={c.id}
              footer={<Button onClick={() => navigate(c.route)}>{c.cta}</Button>}
            >
              <Stack gap={4}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text size="sm" tone="muted">{j?.name ?? c.journeyId}</Text>
                  {c.kind === 'destaque' && <Badge tone="accent">ação pendente</Badge>}
                </Row>
                <Text size="lg">{c.title}</Text>
              </Stack>
            </Card>
          );
        })}
      </div>

      {portal.rejected.length > 0 && (
        <Card title="Jornadas fora do ar" hint="Manifestos rejeitados na validação de contrato.">
          <Stack gap={2}>
            {portal.rejected.map((r) => (
              <Text key={r.id} size="sm" tone="muted" mono>{r.id} — {r.problem}</Text>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
