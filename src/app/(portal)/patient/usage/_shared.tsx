import { Box, Card, Group, Skeleton, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatResetTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    });
}

export function formatResetDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

export function usageBarColor(usedPct: number): string {
    if (usedPct >= 90) return "red";
    if (usedPct >= 60) return "orange";
    return "primary";
}

// ── Stat row ──────────────────────────────────────────────────────────────────

export function StatRow({
    leftLabel, leftValue,
    rightLabel, rightValue,
}: Readonly<{ leftLabel: string; leftValue: string | number; rightLabel: string; rightValue: string | number }>) {
    return (
        <Group gap={0} wrap="nowrap" justify="space-between" align="stretch">
            <Stack gap={2} style={{ flex: 1 }}>
                <Text style={{ fontSize: 10 }} c="dimmed" tt="uppercase" lh={1} fw={600}>{leftLabel}</Text>
                <Text fw={700} size="md" lh={1}>{leftValue}</Text>
            </Stack>
            <Box style={{ width: 1, background: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))", flexShrink: 0 }} />
            <Stack gap={2} style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ fontSize: 10 }} c="dimmed" tt="uppercase" lh={1} fw={600}>{rightLabel}</Text>
                <Text fw={700} size="md" lh={1}>{rightValue}</Text>
            </Stack>
        </Group>
    );
}

// ── Card skeleton ─────────────────────────────────────────────────────────────

export function UsageCardSkeleton() {
    return (
        <Card radius="md">
            {/* Header section skeleton */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="sm" withBorder>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="xs">
                        <Skeleton height={30} width={30} radius="md" />
                        <Stack gap={4}>
                            <Skeleton height={12} width={90} />
                            <Skeleton height={10} width={130} />
                        </Stack>
                    </Group>
                    <Skeleton height={22} width={52} radius="xl" />
                </Group>
            </Card.Section>

            {/* Ring section skeleton */}
            <Card.Section p="md" withBorder>
                <Box style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                    <Skeleton height={100} width={100} radius="50%" />
                </Box>
            </Card.Section>

            {/* Stats + progress section skeleton */}
            <Card.Section p="md" withBorder>
                <Stack gap={10}>
                    <Group justify="space-between">
                        <Stack gap={3} style={{ flex: 1 }}>
                            <Skeleton height={10} width={40} />
                            <Skeleton height={16} width={32} />
                        </Stack>
                        <Skeleton height={36} width={1} />
                        <Stack gap={3} style={{ flex: 1, alignItems: "flex-end" }}>
                            <Skeleton height={10} width={40} />
                            <Skeleton height={16} width={32} />
                        </Stack>
                    </Group>
                    <Stack gap={4}>
                        <Skeleton height={6} radius="xl" />
                        <Group justify="space-between">
                            <Skeleton height={9} width={24} />
                            <Skeleton height={9} width={48} />
                        </Group>
                    </Stack>
                </Stack>
            </Card.Section>

            {/* Footer section skeleton */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))" px="md" py="xs">
                <Skeleton height={10} width="60%" />
            </Card.Section>
        </Card>
    );
}

// ── Error card ────────────────────────────────────────────────────────────────

export function UsageCardError({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
    return (
        <Card radius="md">
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="sm" withBorder>
                <Group gap="xs">
                    <ThemeIcon size={30} radius="md" color="gray" variant="light">
                        <IconAlertCircle size={16} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={600} size="sm" lh={1.2}>{title}</Text>
                        <Text size="xs" c="dimmed">{subtitle}</Text>
                    </Box>
                </Group>
            </Card.Section>
            <Card.Section p="md">
                <Text size="xs" c="dimmed" ta="center">Unable to load. Please refresh.</Text>
            </Card.Section>
        </Card>
    );
}
