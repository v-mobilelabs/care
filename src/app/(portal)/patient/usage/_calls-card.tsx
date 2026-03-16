"use client";
import { useState } from "react";
import { Badge, Box, Card, Group, Progress, RingProgress, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCalendarClock, IconVideo } from "@tabler/icons-react";

import { useCallMetricsQuery } from "@/app/(portal)/patient/_query";
import { formatResetDate, StatRow, usageBarColor, UsageCardError, UsageCardSkeleton } from "./_shared";

const MONTHLY_CALL_LIMIT = 1000;

export function CallsCard() {
    const { data: metrics, isLoading, isError } = useCallMetricsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <UsageCardSkeleton />;
    if (isError || !metrics) return <UsageCardError title="Doctor Calls" subtitle="Video calls this month" />;

    const used = Math.min(metrics.used, MONTHLY_CALL_LIMIT);
    const remaining = Math.max(MONTHLY_CALL_LIMIT - used, 0);
    const usedPct = MONTHLY_CALL_LIMIT > 0 ? Math.min((used / MONTHLY_CALL_LIMIT) * 100, 100) : 0;
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
                borderColor: hovered ? "var(--mantine-color-warning-4)" : undefined,
            }}
        >
            {/* Header */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="sm" withBorder>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="xs">
                        <ThemeIcon size={30} radius="md" color="warning" variant="light">
                            <IconVideo size={16} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm" lh={1.2}>Doctor Calls</Text>
                            <Text size="xs" c="dimmed">Video calls · resets monthly</Text>
                        </Box>
                    </Group>
                    <Badge size="sm" color={remaining === 0 ? "red" : "warning"} variant="light" radius="xl">
                        {remaining} left
                    </Badge>
                </Group>
            </Card.Section>

            {/* Ring */}
            <Card.Section p="md" withBorder>
                <Box
                    style={{
                        borderRadius: 12,
                        background: `light-dark(var(--mantine-color-${barColor}-0), rgba(251,189,35,0.07))`,
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
                                <Text fw={800} size="lg" lh={1} c={barColor}>{Math.round(100 - usedPct)}%</Text>
                                <Text style={{ fontSize: 10 }} c="dimmed" lh={1}>remaining</Text>
                            </Stack>
                        }
                    />
                </Box>
            </Card.Section>

            {/* Stats + progress */}
            <Card.Section p="md" withBorder>
                <Stack gap={10}>
                    <StatRow leftLabel="Used this month" leftValue={used} rightLabel="Monthly limit" rightValue={MONTHLY_CALL_LIMIT.toLocaleString()} />
                    <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                    <Group justify="space-between">
                        <Text style={{ fontSize: 10 }} c="dimmed">0 calls</Text>
                        <Text style={{ fontSize: 10 }} c="dimmed">{usedPct.toFixed(0)}% consumed</Text>
                    </Group>
                </Stack>
            </Card.Section>

            {/* Footer */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))" px="md" py="xs">
                <Group gap={5}>
                    <IconCalendarClock size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                        Resets on{" "}
                        <Text span fw={600} c="inherit">{formatResetDate(metrics.resetsAt)}</Text>
                    </Text>
                </Group>
            </Card.Section>
        </Card>
    );
}
