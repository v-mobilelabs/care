"use client";
import { useState } from "react";
import { Badge, Box, Card, Group, Progress, RingProgress, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";

import { useDependentsQuery } from "@/app/(portal)/patient/_query";
import { StatRow, usageBarColor, UsageCardError, UsageCardSkeleton } from "./_shared";

const PROFILE_LIMIT = 3;

export function ProfilesCard() {
    const { data: dependents, isLoading, isError } = useDependentsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <UsageCardSkeleton />;
    if (isError || !dependents) return <UsageCardError title="Profiles" subtitle="Family member profiles" />;

    const used = dependents.length;
    const usedPct = Math.min((used / PROFILE_LIMIT) * 100, 100);
    const barColor = usageBarColor(usedPct);
    const remaining = PROFILE_LIMIT - used;
    const remainingSlotLabel = remaining === 1 ? "slot" : "slots";

    return (
        <Card
            radius="md"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                boxShadow: hovered ? "0 6px 24px light-dark(rgba(0,0,0,0.09), rgba(0,0,0,0.40))" : undefined,
                transform: hovered ? "translateY(-2px)" : undefined,
                borderColor: hovered ? "var(--mantine-color-success-4)" : undefined,
            }}
        >
            {/* Header */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="sm" withBorder>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="xs">
                        <ThemeIcon size={30} radius="md" color="success" variant="light">
                            <IconUsers size={16} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm" lh={1.2}>Profiles</Text>
                            <Text size="xs" c="dimmed">Family member profiles</Text>
                        </Box>
                    </Group>
                    <Badge size="sm" color={remaining === 0 ? "red" : "success"} variant="light" radius="xl">
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
                                <Text fw={800} size="lg" lh={1} c={barColor}>{used}/{PROFILE_LIMIT}</Text>
                                <Text style={{ fontSize: 10 }} c="dimmed" lh={1}>in use</Text>
                            </Stack>
                        }
                    />
                </Box>
            </Card.Section>

            {/* Stats + progress */}
            <Card.Section p="md" withBorder>
                <Stack gap={10}>
                    <StatRow leftLabel="Created" leftValue={used} rightLabel="Available" rightValue={remaining} />
                    <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                    <Group justify="space-between">
                        <Text style={{ fontSize: 10 }} c="dimmed">0 used</Text>
                        <Text style={{ fontSize: 10 }} c="dimmed">{PROFILE_LIMIT} max</Text>
                    </Group>
                </Stack>
            </Card.Section>

            {/* Footer */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))" px="md" py="xs">
                <Group gap={5}>
                    <IconUsers size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                        {remaining === 0
                            ? "Profile limit reached"
                            : `${remaining} ${remainingSlotLabel} remaining · up to ${PROFILE_LIMIT} allowed`}
                    </Text>
                </Group>
            </Card.Section>
        </Card>
    );
}
