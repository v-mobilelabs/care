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
    Textarea,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconStethoscope,
    IconCalendar,
    IconClock,
    IconUser,
    IconCheck,
    IconLoader,
    IconNotes,
    IconArrowLeft,
    IconDeviceFloppy,
    IconAlertCircle,
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import type { EncounterDto, EncounterStatus } from "@/data/encounters";
import { colors } from "@/ui/tokens";
import { apiFetch } from "@/lib/api/fetch";

// ── Helpers ───────────────────────────────────────────────────────────────────

function encounterStatusColor(status: EncounterStatus): string {
    if (status === "completed") return colors.success;
    return "primary";
}

function encounterStatusLabel(status: EncounterStatus): string {
    if (status === "completed") return "Completed";
    return "Active";
}

function EncounterStatusIcon({ status }: Readonly<{ status: EncounterStatus }>) {
    if (status === "completed") return <IconCheck size={14} />;
    return <IconLoader size={14} />;
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

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatDuration(startedAt: string, endedAt?: string): string | null {
    if (!endedAt) return "Ongoing";
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

// ── Detail content ────────────────────────────────────────────────────────────

export function EncounterDetailContent({
    encounterId,
}: Readonly<{ encounterId: string }>) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const {
        data: encounter,
        isLoading,
        error,
    } = useQuery<EncounterDto>({
        queryKey: ["encounters", encounterId],
        queryFn: () =>
            apiFetch<EncounterDto>(`/api/encounters/${encounterId}`),
    });

    const [notes, setNotes] = useState<string | null>(null);

    // Sync notes state when data loads
    const currentNotes = notes ?? encounter?.notes ?? "";

    const saveNotes = useMutation({
        mutationFn: async (newNotes: string) => {
            await apiFetch(`/api/encounters/${encounterId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: newNotes }),
            });
        },
        onSuccess: () => {
            notifications.show({
                title: "Notes saved",
                message: "Encounter notes have been updated.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            queryClient.invalidateQueries({
                queryKey: ["encounters", encounterId],
            });
            queryClient.invalidateQueries({ queryKey: ["encounters"] });
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Error",
                message: err.message || "Failed to save notes. Please try again.",
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
    });

    if (isLoading) {
        return (
            <Stack gap="md">
                <Skeleton height={40} width={200} radius="md" />
                <Skeleton height={200} radius="lg" />
                <Skeleton height={150} radius="lg" />
            </Stack>
        );
    }

    if (error || !encounter) {
        return (
            <Paper withBorder radius="lg" p="xl">
                <Stack align="center" gap="md" py="md">
                    <ThemeIcon size={52} radius="xl" color="red" variant="light">
                        <IconAlertCircle size={26} />
                    </ThemeIcon>
                    <Text fw={700} size="sm">
                        Failed to load encounter
                    </Text>
                    {error instanceof Error && (
                        <Text size="xs" c="dimmed" ta="center" maw={360}>
                            {error.message}
                        </Text>
                    )}
                    <Button
                        size="xs"
                        variant="light"
                        color="primary"
                        onClick={() => router.back()}
                    >
                        Go back
                    </Button>
                </Stack>
            </Paper>
        );
    }

    const color = encounterStatusColor(encounter.status);
    const duration = formatDuration(encounter.startedAt, encounter.endedAt);

    return (
        <Stack gap="xl">
            {/* Back + header */}
            <Box>
                <Button
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconArrowLeft size={14} />}
                    onClick={() => router.push("/doctor/encounters")}
                    mb="xs"
                >
                    All encounters
                </Button>
                <Group gap="sm" mb={4}>
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconStethoscope size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={3} fw={700}>
                            Encounter Details
                        </Title>
                        <Text c="dimmed" size="xs">
                            Review consultation details and add notes.
                        </Text>
                    </Box>
                </Group>
                <Divider mt="sm" />
            </Box>

            {/* Patient info card */}
            <Paper withBorder radius="lg" p="lg">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <Avatar
                            size={56}
                            radius="xl"
                            color="secondary"
                            variant="light"
                            src={encounter.patientPhotoUrl}
                        >
                            {getInitials(encounter.patientName)}
                        </Avatar>
                        <Stack gap={4}>
                            <Group gap={6}>
                                <IconUser
                                    size={14}
                                    color="var(--mantine-color-dimmed)"
                                />
                                <Text fw={700} size="md">
                                    {encounter.patientName}
                                </Text>
                            </Group>
                            <Group gap={6}>
                                <IconCalendar
                                    size={12}
                                    color="var(--mantine-color-dimmed)"
                                />
                                <Text size="xs" c="dimmed">
                                    {formatDateTime(encounter.startedAt)}
                                </Text>
                            </Group>
                            {duration && (
                                <Group gap={6}>
                                    <IconClock
                                        size={12}
                                        color="var(--mantine-color-dimmed)"
                                    />
                                    <Text size="xs" c="dimmed">
                                        Duration: {duration}
                                    </Text>
                                </Group>
                            )}
                        </Stack>
                    </Group>
                    <Badge
                        color={color}
                        variant="light"
                        size="lg"
                        leftSection={
                            <EncounterStatusIcon status={encounter.status} />
                        }
                    >
                        {encounterStatusLabel(encounter.status)}
                    </Badge>
                </Group>
            </Paper>

            {/* Notes section */}
            <Paper withBorder radius="lg" p="lg">
                <Stack gap="md">
                    <Group gap="sm">
                        <IconNotes
                            size={18}
                            color="var(--mantine-color-primary-6)"
                        />
                        <Text fw={700} size="sm">
                            Encounter Notes
                        </Text>
                    </Group>
                    <Textarea
                        placeholder="Add notes about this encounter..."
                        minRows={4}
                        maxRows={10}
                        autosize
                        value={currentNotes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button
                            size="sm"
                            leftSection={<IconDeviceFloppy size={16} />}
                            loading={saveNotes.isPending}
                            disabled={currentNotes === (encounter.notes ?? "")}
                            onClick={() => saveNotes.mutate(currentNotes)}
                        >
                            Save Notes
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        </Stack>
    );
}
