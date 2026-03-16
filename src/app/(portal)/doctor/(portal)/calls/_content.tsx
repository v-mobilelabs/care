"use client";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Skeleton,
    Stack,
    Text,
} from "@mantine/core";
import {
    IconPhone,
    IconPhoneOff,
    IconPhoneX,
    IconPhoneCall,
    IconClock,
    IconVideo,
    IconChevronRight,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CallRequestDto, CallRequestStatus } from "@/data/meet";
import { colors } from "@/ui/tokens";
import { apiFetch } from "@/lib/api/fetch";
import { iosCard, iosGroupedCard, iosRow, iosRowLast, iosLargeTitle, iosSubtitle, ios, allKeyframes } from "@/ui/ios";

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

// ── iOS Call row ──────────────────────────────────────────────────────────────

function CallRow({
    call,
    isLast,
    index,
    onRejoin,
}: Readonly<{ call: CallRequestDto; isLast: boolean; index: number; onRejoin?: () => void }>) {
    const date = new Date(call.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
    const time = new Date(call.createdAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    const duration = call.status === "ended" ? formatDuration(call.createdAt, call.updatedAt) : null;
    const color = statusColor(call.status);

    return (
        <Box
            style={{
                ...(isLast ? iosRowLast : iosRow),
                paddingLeft: 16,
                paddingRight: 16,
                animation: ios.animation.fadeSlideUp(ios.stagger(index)),
            }}
        >
            <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar
                        size={44}
                        radius="xl"
                        color="secondary"
                        variant="light"
                    >
                        {getInitials(call.patientName)}
                    </Avatar>
                    <Stack gap={2} style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" truncate>
                            {call.patientName}
                        </Text>
                        <Group gap={6} wrap="nowrap">
                            <Text size="xs" c="dimmed">{date} · {time}</Text>
                            {duration && (
                                <Text size="xs" c={`${colors.success}.6`} fw={500}>
                                    {duration}
                                </Text>
                            )}
                        </Group>
                    </Stack>
                </Group>

                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Badge
                        color={color}
                        variant="light"
                        size="sm"
                        radius="xl"
                        leftSection={<StatusIcon status={call.status} />}
                    >
                        {statusLabel(call.status)}
                    </Badge>
                    {call.status === "accepted" && onRejoin && (
                        <Button
                            size="compact-xs"
                            variant="filled"
                            color="primary"
                            radius="xl"
                            leftSection={<IconPhoneCall size={12} />}
                            onClick={onRejoin}
                            style={{ fontWeight: 600 }}
                        >
                            Rejoin
                        </Button>
                    )}
                    <IconChevronRight size={16} color="var(--mantine-color-dimmed)" style={{ opacity: 0.5 }} />
                </Group>
            </Group>
        </Box>
    );
}

// ── Call row with navigation ────────────────────────────────────────────────

function CallRowWithNav({ call, isLast, index }: Readonly<{ call: CallRequestDto; isLast: boolean; index: number }>) {
    const router = useRouter();

    function handleRejoin() {
        router.push(`/meet/${call.id}`);
    }

    return (
        <CallRow
            call={call}
            isLast={isLast}
            index={index}
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
            <style>{allKeyframes}</style>

            {/* iOS large title header */}
            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Group gap="sm" align="center" mb={4}>
                    <Box
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--mantine-color-primary-5)",
                        }}
                    >
                        <IconVideo size={20} />
                    </Box>
                    <Box>
                        <Text style={iosLargeTitle}>Call History</Text>
                        <Text style={iosSubtitle}>
                            All patient video consultations you have handled.
                        </Text>
                    </Box>
                </Group>
            </Box>

            {(() => {
                if (isLoading) {
                    return (
                        <Box style={iosCard}>
                            <Stack gap={0}>
                                {["a", "b", "c"].map((k, i) => (
                                    <Box key={k} px="md" style={i < 2 ? iosRow : iosRowLast}>
                                        <Group gap="md">
                                            <Skeleton radius="xl" width={44} height={44} />
                                            <Stack gap={4} style={{ flex: 1 }}>
                                                <Skeleton height={14} width="40%" />
                                                <Skeleton height={12} width="25%" />
                                            </Stack>
                                        </Group>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    );
                }

                if (error) {
                    return (
                        <Box
                            style={{
                                ...iosCard,
                                padding: 40,
                                textAlign: "center",
                                animation: ios.animation.scaleIn(),
                            }}
                        >
                            <Box
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 16,
                                    background: "light-dark(rgba(239,68,68,0.1), rgba(239,68,68,0.15))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 16px",
                                }}
                            >
                                <IconPhoneX size={26} color="var(--mantine-color-red-6)" />
                            </Box>
                            <Text fw={600} size="sm" mb={4}>Failed to load call history</Text>
                            <Text size="xs" c="dimmed" maw={360} mx="auto" mb="md">
                                {error instanceof Error ? error.message : "Something went wrong."}
                            </Text>
                            <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                radius="xl"
                                onClick={() => startTransition(() => router.refresh())}
                            >
                                Try again
                            </Button>
                        </Box>
                    );
                }

                if (!calls || calls.length === 0) {
                    return (
                        <Box
                            style={{
                                ...iosCard,
                                padding: 48,
                                textAlign: "center",
                                animation: ios.animation.scaleIn(),
                            }}
                        >
                            <Box
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 20,
                                    background: "light-dark(rgba(99,102,241,0.08), rgba(99,102,241,0.12))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 16px",
                                    animation: ios.animation.float,
                                }}
                            >
                                <IconVideo size={32} color="var(--mantine-color-primary-5)" />
                            </Box>
                            <Text fw={600} size="md" mb={6}>No calls yet</Text>
                            <Text size="sm" c="dimmed" maw={320} mx="auto">
                                Patient consultations you handle will appear here.
                            </Text>
                        </Box>
                    );
                }

                return (
                    <Box>
                        <Text size="xs" c="dimmed" fw={500} mb="sm" px={4} style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 11 }}>
                            {calls.length} consultation{calls.length === 1 ? "" : "s"}
                        </Text>
                        <Box style={iosGroupedCard}>
                            {calls.map((call, index) => (
                                <CallRowWithNav
                                    key={call.id}
                                    call={call}
                                    isLast={index === calls.length - 1}
                                    index={index}
                                />
                            ))}
                        </Box>
                    </Box>
                );
            })()}
        </Stack>
    );
}
