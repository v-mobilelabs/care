"use client";
import { useState } from "react";
import {
    Badge,
    Box,
    Group,
    Paper,
    Progress,
    RingProgress,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconBolt,
    IconCalendarClock,
    IconDatabase,
    IconFile,
    IconGauge,
    IconUsers,
} from "@tabler/icons-react";

import { useCreditsQuery, useDependentsQuery, useStorageMetricsQuery } from "@/app/chat/_query";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatResetTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    });
}

function formatResetDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function usageBarColor(usedPct: number): string {
    if (usedPct >= 90) return "red";
    if (usedPct >= 60) return "orange";
    return "primary";
}

// ── Shared card shell ─────────────────────────────────────────────────────────

interface CardShellProps {
    children: React.ReactNode;
    accentColor: string;
    hovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

function CardShell({ children, accentColor, hovered, onMouseEnter, onMouseLeave }: Readonly<CardShellProps>) {
    return (
        <Paper
            withBorder
            radius="lg"
            h="100%"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: hovered ? "0 6px 24px light-dark(rgba(0,0,0,0.09), rgba(0,0,0,0.40))" : undefined,
                transform: hovered ? "translateY(-2px)" : undefined,
                transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                borderColor: hovered ? `var(--mantine-color-${accentColor}-4)` : undefined,
            }}
        >
            {/* Colored top accent stripe */}
            <Box style={{ height: 4, background: `var(--mantine-color-${accentColor}-5)`, flexShrink: 0 }} />
            <Stack gap={0} style={{ flex: 1 }} p="md">
                {children}
            </Stack>
        </Paper>
    );
}

// ── Shared skeleton ───────────────────────────────────────────────────────────

function CardSkeleton() {
    return (
        <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
            <Skeleton height={4} radius={0} />
            <Stack gap={12} p="md">
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
                <Box
                    style={{
                        borderRadius: 12,
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                        padding: "20px 0",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Skeleton height={100} width={100} radius="50%" />
                </Box>
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
                <Skeleton height={10} width="60%" mt={4} />
            </Stack>
        </Paper>
    );
}

// ── Error card ────────────────────────────────────────────────────────────────

function CardError({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
    return (
        <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
            <Box style={{ height: 4, background: "var(--mantine-color-gray-4)" }} />
            <Stack gap={10} p="md">
                <Group gap="xs">
                    <ThemeIcon size={30} radius="md" color="gray" variant="light">
                        <IconAlertCircle size={16} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={600} size="sm" lh={1.2}>{title}</Text>
                        <Text size="xs" c="dimmed">{subtitle}</Text>
                    </Box>
                </Group>
                <Box
                    style={{
                        borderRadius: 10,
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                        padding: "16px",
                        textAlign: "center",
                    }}
                >
                    <Text size="xs" c="dimmed">Unable to load. Please refresh.</Text>
                </Box>
            </Stack>
        </Paper>
    );
}

// ── Shared stat row ───────────────────────────────────────────────────────────

function StatRow({
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

// ── Credits card ──────────────────────────────────────────────────────────────

function CreditsCard() {
    const { data: credits, isLoading, isError } = useCreditsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <CardSkeleton />;
    if (isError || !credits) return <CardError title="Daily Credits" subtitle="AI assessment credits, resets daily" />;

    const used = Math.max(0, credits.total - credits.remaining);
    const remaining = Math.min(Math.max(credits.remaining, 0), credits.total);
    const usedPct = credits.total > 0 ? Math.min(Math.max((used / credits.total) * 100, 0), 100) : 0;
    const barColor = usageBarColor(usedPct);

    return (
        <CardShell accentColor="primary" hovered={hovered} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {/* Header */}
            <Group justify="space-between" align="center" wrap="nowrap" mb={12}>
                <Group gap="xs">
                    <ThemeIcon size={30} radius="md" color="primary" variant="light">
                        <IconBolt size={16} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={600} size="sm" lh={1.2}>Daily Credits</Text>
                        <Text size="xs" c="dimmed">AI assessments · resets daily</Text>
                    </Box>
                </Group>
                <Badge size="sm" color={remaining === 0 ? "red" : barColor} variant="light" radius="xl">
                    {remaining} left
                </Badge>
            </Group>

            {/* Ring — centered on tinted band */}
            <Box
                style={{
                    borderRadius: 12,
                    background: `light-dark(var(--mantine-color-${barColor}-0), rgba(99,102,241,0.07))`,
                    display: "flex",
                    justifyContent: "center",
                    padding: "10px 0",
                    marginBottom: 12,
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

            {/* Stat row */}
            <StatRow leftLabel="Used today" leftValue={used} rightLabel="Daily limit" rightValue={credits.total} />

            {/* Progress */}
            <Stack gap={4} mt={10}>
                <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                <Group justify="space-between">
                    <Text style={{ fontSize: 10 }} c="dimmed">0 used</Text>
                    <Text style={{ fontSize: 10 }} c="dimmed">{usedPct.toFixed(0)}% consumed</Text>
                </Group>
            </Stack>

            {/* Footer */}
            <Group gap={5} mt="auto" pt={10}>
                <IconCalendarClock size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                    Resets at{" "}
                    <Text span fw={600} c="inherit">{formatResetTime(credits.resetsAt)}</Text>
                    {" "}·{" "}{formatResetDate(credits.resetsAt)}
                </Text>
            </Group>
        </CardShell>
    );
}

// ── Storage card ──────────────────────────────────────────────────────────────

function StorageCard() {
    const { data: metrics, isLoading, isError } = useStorageMetricsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <CardSkeleton />;
    if (isError || !metrics) return <CardError title="File Storage" subtitle="Uploaded files across all sessions" />;

    const usedPct = Math.min((metrics.usedBytes / metrics.limitBytes) * 100, 100);
    const barColor = usageBarColor(usedPct);

    return (
        <CardShell accentColor="secondary" hovered={hovered} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {/* Header */}
            <Group justify="space-between" align="center" wrap="nowrap" mb={12}>
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

            {/* Ring */}
            <Box
                style={{
                    borderRadius: 12,
                    background: `light-dark(var(--mantine-color-${barColor}-0), rgba(99,102,241,0.07))`,
                    display: "flex",
                    justifyContent: "center",
                    padding: "10px 0",
                    marginBottom: 12,
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

            {/* Stat row */}
            <StatRow leftLabel="Used" leftValue={formatBytes(metrics.usedBytes)} rightLabel="Free" rightValue={formatBytes(metrics.limitBytes - metrics.usedBytes)} />

            {/* Progress */}
            <Stack gap={4} mt={10}>
                <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                <Group justify="space-between">
                    <Text style={{ fontSize: 10 }} c="dimmed">0 B</Text>
                    <Text style={{ fontSize: 10 }} c="dimmed">{formatBytes(metrics.limitBytes)} total</Text>
                </Group>
            </Stack>

            {/* Footer */}
            <Group gap={5} mt="auto" pt={10}>
                <IconFile size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                    <Text span fw={600} c="inherit">{metrics.fileCount}</Text>
                    {" "}{metrics.fileCount === 1 ? "file" : "files"} stored
                </Text>
            </Group>
        </CardShell>
    );
}

// ── Profiles card ────────────────────────────────────────────────────────────

const PROFILE_LIMIT = 3;

function ProfilesCard() {
    const { data: dependents, isLoading, isError } = useDependentsQuery();
    const [hovered, setHovered] = useState(false);

    if (isLoading) return <CardSkeleton />;
    if (isError || !dependents) return <CardError title="Profiles" subtitle="Family member profiles" />;

    const used = dependents.length;
    const usedPct = Math.min((used / PROFILE_LIMIT) * 100, 100);
    const barColor = usageBarColor(usedPct);
    const remaining = PROFILE_LIMIT - used;
    const remainingSlotLabel = remaining === 1 ? "slot" : "slots";

    return (
        <CardShell accentColor="success" hovered={hovered} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {/* Header */}
            <Group justify="space-between" align="center" wrap="nowrap" mb={12}>
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

            {/* Ring */}
            <Box
                style={{
                    borderRadius: 12,
                    background: `light-dark(var(--mantine-color-${barColor}-0), rgba(99,102,241,0.07))`,
                    display: "flex",
                    justifyContent: "center",
                    padding: "10px 0",
                    marginBottom: 12,
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

            {/* Stat row */}
            <StatRow leftLabel="Created" leftValue={used} rightLabel="Available" rightValue={remaining} />

            {/* Progress */}
            <Stack gap={4} mt={10}>
                <Progress value={usedPct} color={barColor} size="sm" radius="xl" />
                <Group justify="space-between">
                    <Text style={{ fontSize: 10 }} c="dimmed">0 used</Text>
                    <Text style={{ fontSize: 10 }} c="dimmed">{PROFILE_LIMIT} max</Text>
                </Group>
            </Stack>

            {/* Footer */}
            <Group gap={5} mt="auto" pt={10}>
                <IconUsers size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                    {remaining === 0
                        ? "Profile limit reached"
                        : `${remaining} ${remainingSlotLabel} remaining · up to ${PROFILE_LIMIT} allowed`}
                </Text>
            </Group>
        </CardShell>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function UsageContent() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconGauge size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>Usage</Title>
                        <Text size="xs" c="dimmed">Your credits and storage at a glance</Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
                        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
                            <CreditsCard />
                            <StorageCard />
                            <ProfilesCard />
                        </SimpleGrid>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
