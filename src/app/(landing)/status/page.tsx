"use client";

import { useEffect, useState } from "react";
import {
    Container,
    Stack,
    Title,
    Text,
    Button,
    ThemeIcon,
    Group,
    Paper,
    Badge,
    Skeleton,
    SimpleGrid,
    Divider,
} from "@mantine/core";
import {
    IconRefresh,
    IconCircleCheck,
    IconAlertCircle,
    IconActivity,
    IconUsers,
    IconLock,
    IconMessageCircle,
} from "@tabler/icons-react";
import { colors } from "@/ui/tokens";

interface HealthData {
    status: string;
    timestamp: string;
    uptime: number;
}

interface ReadinessData {
    status: "ready" | "not_ready";
    timestamp: string;
    checks: {
        authentication: CheckResult;
        database: CheckResult;
        messaging: CheckResult;
    };
}

interface CheckResult {
    ok: boolean;
    latency?: number;
    error?: string;
}

function getOverallStatusIcon(loading: boolean, isOperational: boolean) {
    if (loading) return <IconActivity size={32} />;
    if (isOperational) return <IconCircleCheck size={32} />;
    return <IconAlertCircle size={32} />;
}

function getOverallStatusText(loading: boolean, isOperational: boolean) {
    if (loading) return "Checking...";
    if (isOperational) return "All Systems Operational";
    return "Degraded Service";
}

function getServiceStatusBadge(
    loading: boolean,
    data: HealthData | ReadinessData | null,
    type: "health" | "ready",
) {
    if (loading) {
        return <Skeleton width={60} height={20} />;
    }

    if (type === "health") {
        if (data) {
            return (
                <Badge color={colors.success} variant="light">
                    Online
                </Badge>
            );
        }
        return (
            <Badge color={colors.danger} variant="light">
                Offline
            </Badge>
        );
    }

    // Type is "ready"
    if (!data) {
        return (
            <Badge color={colors.danger} variant="light">
                Unknown
            </Badge>
        );
    }

    const readyData = data as ReadinessData;
    return (
        <Badge
            color={
                readyData.status === "ready" ? colors.success : colors.warning
            }
            variant="light"
        >
            {readyData.status === "ready" ? "Ready" : "Not Ready"}
        </Badge>
    );
}

export default function StatusPage() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [readiness, setReadiness] = useState<ReadinessData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const fetchStatus = async () => {
        setLoading(true);
        setError(null);

        try {
            const [healthRes, readyRes] = await Promise.all([
                fetch("/api/health"),
                fetch("/api/ready"),
            ]);

            if (healthRes.ok) {
                const healthData = (await healthRes.json()) as HealthData;
                setHealth(healthData);
            }

            if (readyRes.ok || readyRes.status === 503) {
                // 503 is expected when not ready
                const readyData = (await readyRes.json()) as ReadinessData;
                setReadiness(readyData);
            }

            setLastCheck(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchStatus();
    }, []);

    const overallStatus = readiness?.status === "ready" ? "operational" : "degraded";
    const isOperational = overallStatus === "operational";

    return (
        <Container size="md" py="3xl">
            <Stack gap="xl">
                {/* Header */}
                <Group justify="space-between" align="start">
                    <Stack gap="xs">
                        <Title order={1}>System Status</Title>
                        <Text c="dimmed" size="sm">
                            Real-time health monitoring for all platform services
                        </Text>
                    </Stack>
                    <Button
                        leftSection={<IconRefresh size={18} />}
                        onClick={() => void fetchStatus()}
                        loading={loading}
                        variant="light"
                    >
                        Refresh
                    </Button>
                </Group>

                {/* Overall Status */}
                <Paper withBorder radius="lg" p="xl">
                    <Group gap="lg" align="center">
                        <ThemeIcon
                            size={64}
                            radius="xl"
                            variant="light"
                            color={isOperational ? colors.success : colors.warning}
                        >
                            {getOverallStatusIcon(loading, isOperational)}
                        </ThemeIcon>
                        <Stack gap={4}>
                            <Title order={2}>
                                {getOverallStatusText(loading, isOperational)}
                            </Title>
                            <Text c="dimmed" size="sm">
                                {lastCheck
                                    ? `Last checked: ${lastCheck.toLocaleTimeString()}`
                                    : "Loading..."}
                            </Text>
                        </Stack>
                    </Group>
                </Paper>

                {/* Error Message */}
                {error && (
                    <Paper withBorder radius="lg" p="lg" style={{ borderColor: colors.danger }}>
                        <Group>
                            <IconAlertCircle size={20} color={colors.danger} />
                            <Text size="sm" c={colors.danger}>
                                {error}
                            </Text>
                        </Group>
                    </Paper>
                )}

                {/* Service Health */}
                <Stack gap="md">
                    <Title order={3}>Service Health</Title>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <Paper withBorder radius="md" p="lg">
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <Text fw={600}>API Service</Text>
                                    {getServiceStatusBadge(loading, health, "health")}
                                </Group>
                                {health && (
                                    <>
                                        <Text size="sm" c="dimmed">
                                            Uptime: {Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {new Date(health.timestamp).toLocaleString()}
                                        </Text>
                                    </>
                                )}
                            </Stack>
                        </Paper>

                        <Paper withBorder radius="md" p="lg">
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <Text fw={600}>Dependencies</Text>
                                    {getServiceStatusBadge(loading, readiness, "ready")}
                                </Group>
                                {readiness && (
                                    <Text size="xs" c="dimmed">
                                        {new Date(readiness.timestamp).toLocaleString()}
                                    </Text>
                                )}
                            </Stack>
                        </Paper>
                    </SimpleGrid>
                </Stack>

                {/* Service Status */}
                {readiness && (
                    <Stack gap="md">
                        <Title order={3}>Service Status</Title>
                        <Stack gap="sm">
                            {/* Authentication Service */}
                            <Paper withBorder radius="md" p="md">
                                <Group justify="space-between">
                                    <Group>
                                        <ThemeIcon
                                            size="lg"
                                            variant="light"
                                            color={
                                                readiness.checks.authentication.ok
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                        >
                                            <IconLock size={18} />
                                        </ThemeIcon>
                                        <Stack gap={0}>
                                            <Text fw={500}>Authentication Service</Text>
                                            {readiness.checks.authentication.error && (
                                                <Text size="xs" c={colors.danger}>
                                                    Service unavailable
                                                </Text>
                                            )}
                                        </Stack>
                                    </Group>
                                    <Group gap="xs">
                                        {readiness.checks.authentication.latency !== undefined && (
                                            <Text size="xs" c="dimmed">
                                                {readiness.checks.authentication.latency}ms
                                            </Text>
                                        )}
                                        <Badge
                                            color={
                                                readiness.checks.authentication.ok
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                            variant="light"
                                        >
                                            {readiness.checks.authentication.ok ? "OK" : "Failed"}
                                        </Badge>
                                    </Group>
                                </Group>
                            </Paper>

                            {/* Patient Service */}
                            <Paper withBorder radius="md" p="md">
                                <Group justify="space-between">
                                    <Group>
                                        <ThemeIcon
                                            size="lg"
                                            variant="light"
                                            color={
                                                readiness.checks.database.ok
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                        >
                                            <IconUsers size={18} />
                                        </ThemeIcon>
                                        <Stack gap={0}>
                                            <Text fw={500}>Patient Service</Text>
                                            {readiness.checks.database.error && (
                                                <Text size="xs" c={colors.danger}>
                                                    Service unavailable
                                                </Text>
                                            )}
                                        </Stack>
                                    </Group>
                                    <Group gap="xs">
                                        {readiness.checks.database.latency !== undefined && (
                                            <Text size="xs" c="dimmed">
                                                {readiness.checks.database.latency}ms
                                            </Text>
                                        )}
                                        <Badge
                                            color={
                                                readiness.checks.database.ok
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                            variant="light"
                                        >
                                            {readiness.checks.database.ok ? "OK" : "Failed"}
                                        </Badge>
                                    </Group>
                                </Group>
                            </Paper>

                            {/* Realtime Messaging Service */}
                            <Paper withBorder radius="md" p="md">
                                <Group justify="space-between">
                                    <Group>
                                        <ThemeIcon
                                            size="lg"
                                            variant="light"
                                            color={
                                                readiness.checks.messaging.ok
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                        >
                                            <IconMessageCircle size={18} />
                                        </ThemeIcon>
                                        <Stack gap={0}>
                                            <Text fw={500}>Realtime Messaging Service</Text>
                                            {readiness.checks.messaging.error && (
                                                <Text size="xs" c={colors.danger}>
                                                    Service unavailable
                                                </Text>
                                            )}
                                        </Stack>
                                    </Group>
                                    <Group gap="xs">
                                        {readiness.checks.messaging.latency !== undefined && (
                                            <Text size="xs" c="dimmed">
                                                {readiness.checks.messaging.latency}ms
                                            </Text>
                                        )}
                                        <Badge
                                            color={
                                                readiness.checks.messaging.ok
                                                    ? colors.success
                                                    : colors.danger
                                            }
                                            variant="light"
                                        >
                                            {readiness.checks.messaging.ok ? "OK" : "Failed"}
                                        </Badge>
                                    </Group>
                                </Group>
                            </Paper>
                        </Stack>
                    </Stack>
                )}

                <Divider />

                {/* Footer Info */}
                <Paper withBorder radius="md" p="md" style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
                    <Stack gap="xs">
                        <Text size="sm" fw={500}>
                            API Endpoints
                        </Text>
                        <Group gap="xl">
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed">
                                    Health Check
                                </Text>
                                <Text size="xs" ff="monospace">
                                    GET /api/health
                                </Text>
                            </Stack>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed">
                                    Readiness Check
                                </Text>
                                <Text size="xs" ff="monospace">
                                    GET /api/ready
                                </Text>
                            </Stack>
                        </Group>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
}
