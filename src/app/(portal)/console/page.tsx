import {
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBook2,
  IconChartBar,
  IconFiles,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { getCachedMetricsAggregated } from "@/data/cached";
import type { DailyKpiDocument } from "@/data/encounters";
import { getServerUser } from "@/lib/api/server-prefetch";
import Link from "@/ui/link";

export const metadata = { title: "Admin Console" };

type ConsoleCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const CONSOLE_CARDS: readonly ConsoleCard[] = [
  {
    title: "Knowledge Base",
    description: "Manage clinical knowledge entries used by the assistant.",
    href: "/console/knowledge-base",
    icon: <IconBook2 size={20} />,
  },
  {
    title: "Evidence Inspector",
    description: "Review reasoning traces, citations, and confidence details.",
    href: "/console/evidence",
    icon: <IconFiles size={20} />,
  },
  {
    title: "Admin Metrics",
    description: "Track deflection, satisfaction, and operational KPIs.",
    href: "/console/metrics",
    icon: <IconChartBar size={20} />,
  },
] as const;

type SnapshotMetricCard = {
  label: string;
  value: string;
  hint: string;
};

function getDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const endDate = end.toISOString().split("T")[0] ?? "";
  const startDate = start.toISOString().split("T")[0] ?? "";

  return { startDate, endDate };
}

function buildSnapshotCards(kpi: DailyKpiDocument): readonly SnapshotMetricCard[] {
  const resolutionMinutes = Math.round((kpi.avgTimeToResolution || 0) / 1000 / 60);

  return [
    {
      label: "Deflection Rate",
      value: `${kpi.deflectionRate.toFixed(1)}%`,
      hint: `${kpi.encountersDeflected}/${kpi.encountersTotal} encounters`,
    },
    {
      label: "Avg Resolution",
      value: `${resolutionMinutes} min`,
      hint: `${kpi.encountersTotal} encounters in period`,
    },
    {
      label: "Satisfaction",
      value: `${(kpi.avgUserSatisfaction ?? 0).toFixed(2)} / 5`,
      hint: `${kpi.userSatisfactionCount} feedback responses`,
    },
  ] as const;
}

function SnapshotCard({ card }: Readonly<{ card: SnapshotMetricCard }>) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase">
        {card.label}
      </Text>
      <Text size="xl" fw={700} mt={4}>
        {card.value}
      </Text>
      <Text size="xs" c="dimmed" mt={6}>
        {card.hint}
      </Text>
    </Paper>
  );
}

async function getSnapshotCards(profileId: string): Promise<readonly SnapshotMetricCard[]> {
  const { startDate, endDate } = getDateRange();
  const metrics = await getCachedMetricsAggregated(profileId, startDate, endDate);
  const latest = metrics[0];

  if (!latest) {
    return [];
  }

  return buildSnapshotCards(latest);
}

function ConsoleCardItem({ card }: Readonly<{ card: ConsoleCard }>) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack gap="md">
        <Group gap="sm" align="center">
          <ThemeIcon size={36} radius="md" color="primary" variant="light">
            {card.icon}
          </ThemeIcon>
          <Text fw={600}>{card.title}</Text>
        </Group>

        <Text c="dimmed" size="sm">
          {card.description}
        </Text>

        <Box>
          <Link href={card.href}>
            <Button color="primary" variant="light">
              Open {card.title}
            </Button>
          </Link>
        </Box>
      </Stack>
    </Paper>
  );
}

export default async function ConsoleIndexPage() {
  const user = await getServerUser();
  const snapshotCards = user ? await getSnapshotCards(user.uid) : [];

  return (
    <Stack gap="lg" p="xl">
      <Group gap="sm" align="center">
        <ThemeIcon size={40} radius="md" color="primary" variant="light">
          <IconLayoutDashboard size={22} />
        </ThemeIcon>
        <div>
          <Title order={3}>Admin Console</Title>
          <Text c="dimmed" size="sm">
            Choose a workspace to manage platform operations.
          </Text>
        </div>
      </Group>

      <Paper withBorder radius="lg" p="xl">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Text fw={700}>KPI Snapshot (last 7 days)</Text>
            <Link href="/console/metrics">
              <Button variant="subtle" size="xs" color="gray">
                Open full metrics
              </Button>
            </Link>
          </Group>

          {snapshotCards.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {snapshotCards.map((card) => (
                <SnapshotCard key={card.label} card={card} />
              ))}
            </SimpleGrid>
          ) : (
            <Text size="sm" c="dimmed">
              No KPI records available yet. Metrics will appear after encounter aggregation runs.
            </Text>
          )}
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {CONSOLE_CARDS.map((card) => (
          <ConsoleCardItem key={card.href} card={card} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}