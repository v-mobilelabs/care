"use client";
import { useState } from "react";
import { Badge, Box, Card, Group, Progress, RingProgress, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconBolt, IconCalendarClock } from "@tabler/icons-react";

import { useCreditsQuery } from "@/app/(portal)/patient/_query";
import { formatResetDate, formatResetTime, StatRow, usageBarColor, UsageCardError, UsageCardSkeleton } from "./_shared";

export function CreditsCard() {
    const { data: credits, isLoading, isError } = useCreditsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <UsageCardSkeleton />;
    if (isError || !credits) return <UsageCardError title="Monthly Credits" subtitle="AI assessment credits, resets monthly" />;

    const MONTHLY_LIMIT = 100;
    const remaining = Math.min(Math.max(credits.credits, 0), MONTHLY_LIMIT);
    const used = Math.max(0, MONTHLY_LIMIT - remaining);
    const usedPct = MONTHLY_LIMIT > 0 ? Math.min(Math.max((used / MONTHLY_LIMIT) * 100, 0), 100) : 0;
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
                borderColor: hovered ? "var(--mantine-color-primary-4)" : undefined,
            }}
        >
            {/* Header */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="sm" withBorder>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="xs">
                        <ThemeIcon size={30} radius="md" color="primary" variant="light">
                            <IconBolt size={16} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm" lh={1.2}>Monthly Credits</Text>
                            <Text size="xs" c="dimmed">AI assessments · resets monthly</Text>
                        </Box>
                    </Group>
                    <Badge size="sm" color={remaining === 0 ? "red" : barColor} variant="light" radius="xl">
                        {remaining} left
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
                    <StatRow leftLabel="Used this month" leftValue={used} rightLabel="Monthly limit" rightValue={MONTHLY_LIMIT} />
                    <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                    <Group justify="space-between">
                        <Text style={{ fontSize: 10 }} c="dimmed">0 used</Text>
                        <Text style={{ fontSize: 10 }} c="dimmed">{usedPct.toFixed(0)}% consumed</Text>
                    </Group>
                </Stack>
            </Card.Section>

            {/* Footer */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))" px="md" py="xs">
                <Group gap={5}>
                    <IconCalendarClock size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                        Last reset:{" "}
                        <Text span fw={600} c="inherit">{credits.lastReset}</Text>
                    </Text>
                </Group>
            </Card.Section>
        </Card>
    );
}
