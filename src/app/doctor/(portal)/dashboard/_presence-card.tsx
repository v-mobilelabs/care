"use client";
import {
    Badge,
    Box,
    Group,
    Paper,
    Stack,
    Text,
    Title,
} from "@mantine/core";
import {
    IconCircleCheck,
    IconCircleX,
    IconPhoneCall,
} from "@tabler/icons-react";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { colors } from "@/ui/tokens";

function StatusIcon({ status }: Readonly<{ status: "online" | "busy" | "offline" }>) {
    if (status === "busy") return <IconPhoneCall size={20} color="var(--mantine-color-orange-5)" />;
    if (status === "online") return <IconCircleCheck size={20} color="var(--mantine-color-teal-5)" />;
    return <IconCircleX size={20} color="var(--mantine-color-gray-5)" />;
}

function statusLabel(status: "online" | "busy" | "offline"): string {
    if (status === "busy") return "On a call";
    if (status === "online") return "Available";
    return "Offline";
}

function statusColor(status: "online" | "busy" | "offline"): string {
    if (status === "busy") return colors.warning;
    if (status === "online") return colors.success;
    return colors.muted;
}

function formatLastSeen(ts: number | null): string {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastSeenDate(ts: number | null): string {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

export function PresenceCard() {
    const { user } = useAuth();
    const presence = usePresenceStatus(user?.uid);

    const status: "online" | "busy" | "offline" = (() => {
        if (!presence.online) return "offline";
        if (presence.status === "busy") return "busy";
        return "online";
    })();

    const label = statusLabel(status);
    const color = statusColor(status);

    return (
        <Paper
            withBorder
            radius="lg"
            p="xl"
            style={{
                borderColor: status === "online"
                    ? "var(--mantine-color-teal-4)"
                    : "var(--mantine-color-default-border)",
                background: status === "online"
                    ? "light-dark(var(--mantine-color-teal-0), rgba(32,178,170,0.06))"
                    : undefined,
                transition: "background 0.3s ease, border-color 0.3s ease",
            }}
        >
            <Stack gap="lg">
                {/* Status header */}
                <Group justify="space-between" wrap="nowrap">
                    <Stack gap={4}>
                        <Title order={4}>Availability</Title>
                        <Text size="sm" c="dimmed">
                            Your status is automatically managed based on your session.
                        </Text>
                    </Stack>
                    <Badge size="lg" radius="md" color={color}>
                        {label}
                    </Badge>
                </Group>

                {/* Status detail */}
                <Box
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: "var(--mantine-spacing-md)",
                    }}
                >
                    <Paper withBorder radius="md" p="md">
                        <Group gap="sm" wrap="nowrap">
                            <StatusIcon status={status} />
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed" fw={500}>Current status</Text>
                                <Text size="sm" fw={600}>{label}</Text>
                            </Stack>
                            {presence.lastSeen && (
                                <Text size="xs" c="dimmed" ml="auto">
                                    {formatLastSeenDate(presence.lastSeen)} at {formatLastSeen(presence.lastSeen)}
                                </Text>
                            )}
                        </Group>
                    </Paper>
                </Box>

                {/* Explanation */}
                <Text size="xs" c="dimmed" ta="center">
                    {status === "online"
                        ? "Patients can see you\u2019re available and request a call."
                        : status === "busy"
                            ? "You\u2019re currently on a call. New requests are paused."
                            : "You\u2019ll appear available automatically when you\u2019re signed in."}
                </Text>
            </Stack>
        </Paper>
    );
}
