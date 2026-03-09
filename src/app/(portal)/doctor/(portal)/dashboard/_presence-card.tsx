"use client";
import {
    Badge,
    Box,
    Group,
    Stack,
    Text,
} from "@mantine/core";
import {
    IconCircleCheck,
    IconCircleX,
    IconPhoneCall,
} from "@tabler/icons-react";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { colors } from "@/ui/tokens";
import { iosCard, iosRow, iosRowLast, ios, allKeyframes } from "@/ui/ios";

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
    const presence = usePresenceStatus(user?.uid ?? "");

    const status: "online" | "busy" | "offline" = (() => {
        if (!presence.online) return "offline";
        if (presence.status === "busy") return "busy";
        return "online";
    })();

    const label = statusLabel(status);
    const color = statusColor(status);

    return (
        <Box
            style={{
                ...iosCard,
                borderColor: status === "online"
                    ? "var(--mantine-color-teal-4)"
                    : undefined,
                transition: ios.transition.spring,
                animation: ios.animation.fadeSlideUp("150ms"),
            }}
        >
            <style>{allKeyframes}</style>

            {/* Header */}
            <Box px="lg" pt="lg" pb="sm">
                <Group justify="space-between" wrap="nowrap">
                    <Stack gap={4}>
                        <Text fw={600} size="md">Availability</Text>
                        <Text size="xs" c="dimmed">
                            Automatically managed based on your session.
                        </Text>
                    </Stack>
                    <Badge
                        size="lg"
                        radius="xl"
                        color={color}
                        style={{
                            transition: ios.transition.spring,
                            animation: status === "online" ? ios.animation.pulse : undefined,
                        }}
                    >
                        {label}
                    </Badge>
                </Group>
            </Box>

            {/* Status detail — iOS grouped row */}
            <Box px="lg" style={iosRow}>
                <Group gap="sm" wrap="nowrap">
                    <Box
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: status === "online"
                                ? "light-dark(rgba(32,178,170,0.1), rgba(32,178,170,0.15))"
                                : status === "busy"
                                    ? "light-dark(rgba(255,152,0,0.1), rgba(255,152,0,0.15))"
                                    : "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: ios.transition.color,
                        }}
                    >
                        <StatusIcon status={status} />
                    </Box>
                    <Stack gap={2} style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" fw={500}>Current status</Text>
                        <Text size="sm" fw={600}>{label}</Text>
                    </Stack>
                    {presence.lastSeen && (
                        <Text size="xs" c="dimmed">
                            {formatLastSeenDate(presence.lastSeen)} at {formatLastSeen(presence.lastSeen)}
                        </Text>
                    )}
                </Group>
            </Box>

            {/* Explanation */}
            <Box px="lg" pb="lg" pt="sm">
                <Text size="xs" c="dimmed" ta="center">
                    {status === "online"
                        ? "Patients can see you\u2019re available and request a call."
                        : status === "busy"
                            ? "You\u2019re currently on a call. New requests are paused."
                            : "You\u2019ll appear available automatically when you\u2019re signed in."}
                </Text>
            </Box>
        </Box>
    );
}
