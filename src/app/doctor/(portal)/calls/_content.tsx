"use client";
import {
    Avatar,
    Badge,
    Box,
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
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CallRequestDto, CallRequestStatus } from "@/data/meet";
import { colors } from "@/ui/tokens";

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(status: CallRequestStatus): string {
    switch (status) {
        case "ended":
            return colors.success;
        case "accepted":
            return "primary";
        case "pending":
            return "yellow";
        case "cancelled":
        case "rejected":
        case "missed":
            return colors.danger;
        default:
            return "gray";
    }
}

function statusLabel(status: CallRequestStatus): string {
    switch (status) {
        case "ended":
            return "Completed";
        case "accepted":
            return "Active";
        case "pending":
            return "Waiting";
        case "cancelled":
            return "Cancelled";
        case "rejected":
            return "Rejected";
        case "missed":
            return "Missed";
        default:
            return status;
    }
}

function StatusIcon({ status }: Readonly<{ status: CallRequestStatus }>) {
    if (status === "ended") return <IconPhone size={16} />;
    if (status === "accepted") return <IconPhoneCall size={16} />;
    if (status === "pending") return <IconClock size={16} />;
    if (status === "cancelled") return <IconPhoneOff size={16} />;
    return <IconPhoneX size={16} />;
}

// ── Call row ──────────────────────────────────────────────────────────────────

function CallRow({ call }: Readonly<{ call: CallRequestDto }>) {
    const formatted = new Date(call.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

    const initials = call.patientName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <Avatar size="sm" radius="xl" color="primary">
                        {initials}
                    </Avatar>
                    <Stack gap={2}>
                        <Text fw={600} size="sm">
                            {call.patientName}
                        </Text>
                        <Group gap={6} wrap="nowrap">
                            <ThemeIcon
                                size={18}
                                radius="xl"
                                color={statusColor(call.status)}
                                variant="light"
                            >
                                <StatusIcon status={call.status} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">
                                {formatted}
                            </Text>
                        </Group>
                    </Stack>
                </Group>
                <Badge color={statusColor(call.status)} variant="light" size="sm">
                    {statusLabel(call.status)}
                </Badge>
            </Group>
        </Paper>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DoctorCallsContent() {
    const { data: calls, isLoading, error } = useQuery<CallRequestDto[]>({
        queryKey: ["meet", "history"],
        queryFn: async () => {
            const res = await fetch("/api/meet/history");
            if (!res.ok) throw new Error("Failed to load call history");
            return res.json() as Promise<CallRequestDto[]>;
        },
        staleTime: 60_000,
    });
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Stack gap="lg">
            <Box>
                <Title order={2}>Call History</Title>
                <Text c="dimmed" size="sm" mt={4}>
                    All patient video consultations you have handled.
                </Text>
            </Box>

            {(() => {
                if (isLoading) {
                    return (
                        <Stack gap="sm">
                            {["a", "b", "c"].map((k) => (
                                <Skeleton key={k} height={72} radius="lg" />
                            ))}
                        </Stack>
                    );
                }

                if (error) {
                    return (
                        <Paper withBorder radius="lg" p="xl">
                            <Stack align="center" gap="sm" py="md">
                                <IconPhoneX size={40} color="var(--mantine-color-red-4)" />
                                <Text fw={600} c="red">
                                    Failed to load call history
                                </Text>
                                <Text
                                    size="sm"
                                    c="primary"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => startTransition(() => router.refresh())}
                                >
                                    Try again
                                </Text>
                            </Stack>
                        </Paper>
                    );
                }

                if (!calls || calls.length === 0) {
                    return (
                        <Paper withBorder radius="lg" p="xl">
                            <Stack align="center" gap="sm" py="xl">
                                <ThemeIcon size={56} radius="xl" color="primary" variant="light">
                                    <IconVideo size={28} />
                                </ThemeIcon>
                                <Title order={4} c="dimmed">
                                    No calls yet
                                </Title>
                                <Text size="sm" c="dimmed" ta="center">
                                    Patient consultations you handle will appear here.
                                </Text>
                            </Stack>
                        </Paper>
                    );
                }

                return (
                    <Stack gap="sm">
                        {calls.map((call) => (
                            <CallRow key={call.id} call={call} />
                        ))}
                    </Stack>
                );
            })()}
        </Stack>
    );
}
