"use client";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Paper,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconPhone,
    IconPhoneOff,
    IconPhoneX,
    IconPhoneCall,
    IconClock,
    IconVideo,
    IconCalendar,
    IconPlayerPlay,
    IconUser,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CallRequestDto, CallRequestStatus } from "@/data/meet";
import { colors } from "@/ui/tokens";
import { apiFetch } from "@/lib/api/fetch";

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(status: CallRequestStatus): string {
    switch (status) {
        case "ended": return colors.success;
        case "accepted": return "primary";
        case "pending": return "yellow";
        case "cancelled":
        case "rejected":
        case "missed": return colors.danger;
        default: return "gray";
    }
}

function statusLabel(status: CallRequestStatus): string {
    switch (status) {
        case "ended": return "Completed";
        case "accepted": return "Active";
        case "pending": return "Waiting";
        case "cancelled": return "Cancelled";
        case "rejected": return "Rejected";
        case "missed": return "Missed";
        default: return status;
    }
}

function StatusIcon({ status }: Readonly<{ status: CallRequestStatus }>) {
    if (status === "ended") return <IconPhone size={14} />;
    if (status === "accepted") return <IconPhoneCall size={14} />;
    if (status === "pending") return <IconClock size={14} />;
    if (status === "cancelled") return <IconPhoneOff size={14} />;
    return <IconPhoneX size={14} />;
}

function formatDuration(createdAt: string, updatedAt: string): string | null {
    const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

function getInitials(name: string | undefined | null): string {
    if (!name) return "?";
    return name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}

// ── Call card ─────────────────────────────────────────────────────────────────

function CallCard({ call, onRejoin }: Readonly<{ call: CallRequestDto; onRejoin?: () => void }>) {
    const date = new Date(call.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const time = new Date(call.createdAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    const duration = call.status === "ended" ? formatDuration(call.createdAt, call.updatedAt) : null;
    const color = statusColor(call.status);

    return (
        <Paper withBorder radius="lg" p="md" style={{ overflow: "hidden" }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                {/* Left: avatar + info */}
                <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Box pos="relative">
                        <Avatar
                            size={48}
                            radius="xl"
                            color="secondary"
                            variant="light"
                        >
                            {getInitials(call.patientName)}
                        </Avatar>
                        <Box
                            pos="absolute"
                            style={{
                                bottom: -2,
                                right: -2,
                                borderRadius: "50%",
                                background: `var(--mantine-color-${color}-1)`,
                                border: "2px solid var(--mantine-color-body)",
                                width: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Box c={`${color}.6`}>
                                <StatusIcon status={call.status} />
                            </Box>
                        </Box>
                    </Box>

                    <Stack gap={4} style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                            <IconUser size={12} color="var(--mantine-color-dimmed)" />
                            <Text fw={700} size="sm" truncate>
                                {call.patientName}
                            </Text>
                        </Group>
                        <Group gap={6} wrap="nowrap">
                            <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed">{date}</Text>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{time}</Text>
                        </Group>
                        {duration && (
                            <Group gap={4} wrap="nowrap">
                                <IconPlayerPlay size={11} color={`var(--mantine-color-${colors.success}-6)`} />
                                <Text size="xs" c={`${colors.success}.6`} fw={500}>
                                    {duration}
                                </Text>
                            </Group>
                        )}
                    </Stack>
                </Group>

                {/* Right: badge + optional rejoin */}
                <Stack gap={6} align="flex-end" style={{ flexShrink: 0 }}>
                    <Badge
                        color={color}
                        variant="light"
                        size="sm"
                        leftSection={<StatusIcon status={call.status} />}
                    >
                        {statusLabel(call.status)}
                    </Badge>
                    {call.status === "accepted" && onRejoin && (
                        <Button
                            size="compact-xs"
                            variant="filled"
                            color="primary"
                            leftSection={<IconPhoneCall size={12} />}
                            onClick={onRejoin}
                        >
                            Rejoin
                        </Button>
                    )}
                </Stack>
            </Group>
        </Paper>
    );
}
// ── Call card with navigation ───────────────────────────────────────────────

function CallCardWithNav({ call }: Readonly<{ call: CallRequestDto }>) {
    const router = useRouter();

    function handleRejoin() {
        router.push(`/meet/${call.id}`);
    }

    return (
        <CallCard
            call={call}
            onRejoin={call.status === "accepted" ? handleRejoin : undefined}
        />
    );
}
// ── Main component ────────────────────────────────────────────────────────────

export function DoctorCallsContent() {
    const { data: calls, isLoading, error } = useQuery<CallRequestDto[]>({
        queryKey: ["meet", "history"],
        queryFn: () =>
            apiFetch<CallRequestDto[]>("/api/meet/history"),
        staleTime: 60_000,
    });
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Stack gap="xl">
            {/* Header */}
            <Box>
                <Group gap="sm" mb={4}>
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconVideo size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={3} fw={700}>Call History</Title>
                        <Text c="dimmed" size="xs">
                            All patient video consultations you have handled.
                        </Text>
                    </Box>
                </Group>
                <Divider mt="sm" />
            </Box>

            {(() => {
                if (isLoading) {
                    return (
                        <Stack gap="sm">
                            {["a", "b", "c"].map((k) => (
                                <Skeleton key={k} height={80} radius="lg" />
                            ))}
                        </Stack>
                    );
                }

                if (error) {
                    return (
                        <Paper withBorder radius="lg" p="xl">
                            <Stack align="center" gap="md" py="md">
                                <ThemeIcon size={52} radius="xl" color="red" variant="light">
                                    <IconPhoneX size={26} />
                                </ThemeIcon>
                                <Stack gap={4} align="center">
                                    <Text fw={700} size="sm">Failed to load call history</Text>
                                    <Text size="xs" c="dimmed" ta="center" maw={360}>
                                        {error instanceof Error
                                            ? error.message
                                            : "Something went wrong. Please try again."}
                                    </Text>
                                </Stack>
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="primary"
                                    onClick={() => startTransition(() => router.refresh())}
                                >
                                    Try again
                                </Button>
                            </Stack>
                        </Paper>
                    );
                }

                if (!calls || calls.length === 0) {
                    return (
                        <Paper
                            withBorder
                            radius="lg"
                            p="xl"
                            style={{
                                background: "light-dark(var(--mantine-color-primary-0), rgba(99,102,241,0.06))",
                            }}
                        >
                            <Stack align="center" gap="md" py="xl">
                                <ThemeIcon size={64} radius="xl" color="primary" variant="light">
                                    <IconVideo size={32} />
                                </ThemeIcon>
                                <Stack gap={6} align="center">
                                    <Title order={4}>No calls yet</Title>
                                    <Text size="sm" c="dimmed" ta="center" maw={320}>
                                        Patient consultations you handle will appear here.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Paper>
                    );
                }

                return (
                    <Stack gap="sm">
                        <Text size="xs" c="dimmed" fw={500}>
                            {calls.length} consultation{calls.length === 1 ? "" : "s"}
                        </Text>
                        {calls.map((call) => (
                            <CallCardWithNav key={call.id} call={call} />
                        ))}
                    </Stack>
                );
            })()}
        </Stack>
    );
}
