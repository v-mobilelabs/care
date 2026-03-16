"use client";
import { useState } from "react";
import { Badge, Box, Card, Group, Progress, RingProgress, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconDatabase, IconFile } from "@tabler/icons-react";

import { useStorageMetricsQuery } from "@/app/(portal)/patient/_query";
import { formatBytes, StatRow, usageBarColor, UsageCardError, UsageCardSkeleton } from "./_shared";

export function StorageCard() {
    const { data: metrics, isLoading, isError } = useStorageMetricsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <UsageCardSkeleton />;
    if (isError || !metrics) return <UsageCardError title="File Storage" subtitle="Uploaded files across all sessions" />;

    const usedPct = Math.min((metrics.usedBytes / metrics.limitBytes) * 100, 100);
    const barColor = usageBarColor(usedPct);

    return (
        <Card
            radius="md"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                boxShadow: hovered ? "0 6px 24px light-dark(rgba(0,0,0,0.09), rgba(0,0,0,0.40))" : undefined,
                transform: hovered ? "translateY(-2px)" : undefined,
                borderColor: hovered ? "var(--mantine-color-secondary-4)" : undefined,
            }}
        >
            {/* Header */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="sm" withBorder>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="xs">
                        <ThemeIcon size={30} radius="md" color="secondary" variant="light">
                            <IconDatabase size={16} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm" lh={1.2}>File Storage</Text>
                            <Text size="xs" c="dimmed">Uploaded files across sessions</Text>
                        </Box>
                    </Group>
                    <Badge size="sm" color={usedPct >= 90 ? "red" : "secondary"} variant="light" radius="xl">
                        {usedPct.toFixed(0)}% used
                    </Badge>
                </Group>
            </Card.Section>

            {/* Ring */}
            <Card.Section p="md" withBorder>
                <Box
                    style={{
                        borderRadius: 12,
                        background: `light-dark(var(--mantine-color-${barColor}-0), rgba(99,102,241,0.07))`,
                        display: "flex",
                        justifyContent: "center",
                        padding: "10px 0",
                    }}
                >
                    <RingProgress
                        size={100}
                        thickness={10}
                        roundCaps
                        sections={[{ value: usedPct, color: barColor }]}
                        label={
                            <Stack gap={2} align="center">
                                <Text fw={800} size="lg" lh={1} c={barColor}>{usedPct.toFixed(0)}%</Text>
                                <Text style={{ fontSize: 10 }} c="dimmed" lh={1}>used</Text>
                            </Stack>
                        }
                    />
                </Box>
            </Card.Section>

            {/* Stats + progress */}
            <Card.Section p="md" withBorder>
                <Stack gap={10}>
                    <StatRow leftLabel="Used" leftValue={formatBytes(metrics.usedBytes)} rightLabel="Free" rightValue={formatBytes(metrics.limitBytes - metrics.usedBytes)} />
                    <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                    <Group justify="space-between">
                        <Text style={{ fontSize: 10 }} c="dimmed">0 B</Text>
                        <Text style={{ fontSize: 10 }} c="dimmed">{formatBytes(metrics.limitBytes)} total</Text>
                    </Group>
                </Stack>
            </Card.Section>

            {/* Footer */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))" px="md" py="xs">
                <Group gap={5}>
                    <IconFile size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                        <Text span fw={600} c="inherit">{metrics.fileCount}</Text>
                        {" "}{metrics.fileCount === 1 ? "file" : "files"} stored
                    </Text>
                </Group>
            </Card.Section>
        </Card>
    );
}
