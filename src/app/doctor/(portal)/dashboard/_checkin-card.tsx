"use client";
import {
    Badge,
    Box,
    Button,
    Group,
    Paper,
    Stack,
    Text,
    Title,
    Tooltip,
} from "@mantine/core";
import {
    IconDoorEnter,
    IconDoorExit,
    IconClock,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { colors } from "@/ui/tokens";
import type { DoctorProfileDto } from "@/data/doctors";

async function fetchProfile(): Promise<DoctorProfileDto> {
    const res = await fetch("/api/doctors/me");
    if (!res.ok) throw new Error("Could not load profile.");
    return res.json() as Promise<DoctorProfileDto>;
}

async function updateAvailability(
    availability: "available" | "unavailable",
): Promise<DoctorProfileDto> {
    const res = await fetch("/api/doctors/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability }),
    });
    if (!res.ok) throw new Error("Could not update availability.");
    return res.json() as Promise<DoctorProfileDto>;
}

function formatTime(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

export function CheckInCard() {
    const queryClient = useQueryClient();

    const { data: profile, isLoading } = useQuery({
        queryKey: ["doctor-profile"],
        queryFn: fetchProfile,
    });

    const mutation = useMutation({
        mutationFn: updateAvailability,
        onSuccess: (updated) => {
            queryClient.setQueryData(["doctor-profile"], updated);
            const isAvailable = updated.availability === "available";
            notifications.show({
                title: isAvailable ? "Checked in" : "Checked out",
                message: isAvailable
                    ? "You are now marked as available."
                    : "You are now marked as unavailable.",
                color: isAvailable ? colors.success : colors.muted,
            });
        },
        onError: () => {
            notifications.show({
                title: "Error",
                message: "Could not update availability. Try again.",
                color: colors.danger,
            });
        },
    });

    const isAvailable = profile?.availability === "available";
    const isPending = mutation.isPending;

    return (
        <Paper
            withBorder
            radius="lg"
            p="xl"
            style={{
                borderColor: isAvailable
                    ? "var(--mantine-color-teal-4)"
                    : "var(--mantine-color-default-border)",
                background: isAvailable
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
                            Toggle your status to let patients know if you&apos;re available.
                        </Text>
                    </Stack>
                    <Badge
                        size="lg"
                        radius="md"
                        color={isAvailable ? colors.success : colors.muted}
                    >
                        {isLoading ? "Loading…" : isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                </Group>

                {/* Times */}
                {profile && (
                    <Box
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "var(--mantine-spacing-md)",
                        }}
                    >
                        <Paper withBorder radius="md" p="md">
                            <Group gap="xs" wrap="nowrap">
                                <IconDoorEnter size={18} color="var(--mantine-color-teal-5)" />
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed" fw={500}>Last check-in</Text>
                                    <Tooltip label={formatDate(profile.checkedInAt)} openDelay={300} withArrow>
                                        <Text size="sm" fw={600}>{formatTime(profile.checkedInAt)}</Text>
                                    </Tooltip>
                                </Stack>
                            </Group>
                        </Paper>
                        <Paper withBorder radius="md" p="md">
                            <Group gap="xs" wrap="nowrap">
                                <IconDoorExit size={18} color="var(--mantine-color-orange-5)" />
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed" fw={500}>Last check-out</Text>
                                    <Tooltip label={formatDate(profile.checkedOutAt)} openDelay={300} withArrow>
                                        <Text size="sm" fw={600}>{formatTime(profile.checkedOutAt)}</Text>
                                    </Tooltip>
                                </Stack>
                            </Group>
                        </Paper>
                    </Box>
                )}

                {/* Action button */}
                <Button
                    size="md"
                    radius="md"
                    fullWidth
                    loading={isPending || isLoading}
                    color={isAvailable ? "orange" : colors.success}
                    leftSection={
                        isAvailable ? <IconDoorExit size={18} /> : <IconDoorEnter size={18} />
                    }
                    onClick={() =>
                        mutation.mutate(isAvailable ? "unavailable" : "available")
                    }
                >
                    {isAvailable ? "Check out — Mark unavailable" : "Check in — Mark available"}
                </Button>

                {profile && (
                    <Group gap="xs" justify="center">
                        <IconClock size={14} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed">
                            Last updated: {formatDate(profile.updatedAt)} at {formatTime(profile.updatedAt)}
                        </Text>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}
