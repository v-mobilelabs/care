import { Badge, Group, Paper, Table, Text } from "@mantine/core";
import type { DailyKpiDocument } from "@/data/encounters";

interface CardProps {
  kpis: DailyKpiDocument[];
}

function getLatestAndPrevious(
  kpis: DailyKpiDocument[],
): { latest?: DailyKpiDocument; previous?: DailyKpiDocument } {
  const latest = kpis[0];
  const previous = kpis.length > 1 ? kpis[1] : undefined;
  return { latest, previous };
}

export function DeflectionRateCard({ kpis }: Readonly<CardProps>) {
  const { latest, previous } = getLatestAndPrevious(kpis);
  if (!latest) return null;

  const change = previous ? latest.deflectionRate - previous.deflectionRate : 0;

  return (
    <Paper withBorder radius="lg" p="xl">
      <Text size="sm" c="dimmed">
        Deflection Rate
      </Text>
      <Text size="xl" fw={700}>
        {latest.deflectionRate.toFixed(1)}%
      </Text>
      <Badge color={change >= 0 ? "success" : "danger"}>
        {`${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs previous day`}
      </Badge>
    </Paper>
  );
}

export function ResolutionTimeCard({ kpis }: Readonly<CardProps>) {
  const { latest } = getLatestAndPrevious(kpis);
  if (!latest) return null;

  const avgMinutes = Math.round((latest.avgTimeToResolution || 0) / 1000 / 60);

  return (
    <Paper withBorder radius="lg" p="xl">
      <Text size="sm" c="dimmed">
        Avg Resolution Time
      </Text>
      <Text size="xl" fw={700}>
        {avgMinutes} min
      </Text>
      <Text size="xs" c="dimmed">
        {latest.encountersTotal} encounters
      </Text>
    </Paper>
  );
}

export function SatisfactionCard({ kpis }: Readonly<CardProps>) {
  const { latest } = getLatestAndPrevious(kpis);
  if (!latest) return null;

  const averageSatisfaction = latest.avgUserSatisfaction ?? 0;

  return (
    <Paper withBorder radius="lg" p="xl">
      <Text size="sm" c="dimmed">
        User Satisfaction
      </Text>
      <Text size="xl" fw={700}>
        {averageSatisfaction.toFixed(2)} / 5
      </Text>
      <Badge color="secondary">{latest.userSatisfactionCount} responses</Badge>
    </Paper>
  );
}

export function AgentBreakdownCard({ kpis }: Readonly<CardProps>) {
  const { latest } = getLatestAndPrevious(kpis);
  if (!latest) return null;

  const rows = Object.entries(latest.agentMetrics ?? {});
  if (rows.length === 0) return null;

  return (
    <Paper withBorder radius="lg" p="xl">
      <Text size="sm" c="dimmed" mb="md">
        Encounters by Agent
      </Text>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Agent</Table.Th>
            <Table.Th style={{ textAlign: "right" }}>Count</Table.Th>
            <Table.Th style={{ textAlign: "right" }}>Deflection %</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(([agent, metrics]) => {
            const deflection =
              metrics.total > 0 ? (metrics.deflected / metrics.total) * 100 : 0;

            return (
              <Table.Tr key={agent}>
                <Table.Td>{agent}</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>{metrics.total}</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {deflection.toFixed(1)}%
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Group mt="sm" gap="xs">
        <Badge color="secondary" variant="light">
          {latest.date}
        </Badge>
      </Group>
    </Paper>
  );
}
