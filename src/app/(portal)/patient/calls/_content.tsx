"use client";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Collapse,
    Divider,
    Group,
    Paper,
    ScrollArea,
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
    IconFileText,
    IconChevronDown,
    IconChevronUp,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCallHistory } from "./_query";
import type { CallRequestDto, CallRequestStatus } from "@/data/meet";
import { colors } from "@/ui/tokens";

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
    const [transcriptOpen, setTranscriptOpen] = useState(false);
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
        <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
            <Box p="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    {/* Left: avatar + info */}
                    <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Box pos="relative">
                            <Avatar
                                size={48}
                                radius="xl"
                                color="primary"
                                variant="light"
                            >
                                {getInitials(call.doctorName)}
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
                            <Text fw={700} size="sm" truncate>
                                Dr. {call.doctorName}
                            </Text>
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
                        {call.status === "ended" && call.recordingUrl && (
                            <Button
                                size="compact-xs"
                                variant="light"
                                color="primary"
                                leftSection={<IconVideo size={12} />}
                                component="a"
                                href={call.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Recording
                            </Button>
                        )}
                        {call.status === "ended" && call.transcript && (
                            <Button
                                size="compact-xs"
                                variant={transcriptOpen ? "filled" : "light"}
                                color="primary"
                                leftSection={<IconFileText size={12} />}
                                rightSection={transcriptOpen ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}
                                onClick={() => setTranscriptOpen((v) => !v)}
                            >
                                Transcript
                            </Button>
                        )}
                    </Stack>
                </Group>
            </Box>

            {/* Inline transcript panel */}
            {call.transcript && (
                <Collapse in={transcriptOpen}>
                    <Divider />
                    <Box
                        px="md"
                        py="sm"
                        style={{
                            background: "light-dark(var(--mantine-color-primary-0), rgba(99,102,241,0.06))",
                        }}
                    >
                        <Group gap={6} mb={8}>
                            <IconFileText size={13} color={`var(--mantine-color-primary-6)`} />
                            <Text size="xs" fw={600} c="primary">Transcript</Text>
                        </Group>
                        <ScrollArea.Autosize mah={240} offsetScrollbars>
                            <Text
                                size="sm"
                                style={{
                                    whiteSpace: "pre-wrap",
                                    lineHeight: 1.75,
                                }}
                            >
                                {call.transcript}
                            </Text>
                        </ScrollArea.Autosize>
                    </Box>
                </Collapse>
            )}
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

export function CallsContent() {
    const { data: calls, isLoading, error } = useCallHistory();
    const router = useRouter();
    const [, startTransition] = useTransition();

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
                        <IconVideo size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>Call History</Title>
                        <Text c="dimmed" size="xs">
                            All your video consultations with doctors.
                        </Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
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
                                                <Text size="xs" c="dimmed">Something went wrong. Please try again.</Text>
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
                                                    Your video consultation history with doctors will appear here.
                                                </Text>
                                            </Stack>
                                            <Button
                                                variant="filled"
                                                color="primary"
                                                size="sm"
                                                leftSection={<IconVideo size={16} />}
                                                onClick={() =>
                                                    startTransition(() => router.push("/patient/connect"))
                                                }
                                            >
                                                See a Doctor
                                            </Button>
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
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
