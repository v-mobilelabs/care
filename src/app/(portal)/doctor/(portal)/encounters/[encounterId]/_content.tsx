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
    Textarea,
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
import { iosCard, iosLargeTitle, iosSubtitle, ios, allKeyframes } from "@/ui/ios";

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
                <Skeleton height={200} radius={16} />
                <Skeleton height={150} radius={16} />
            </Stack>
        );
    }

    if (error || !encounter) {
        return (
            <Box
                style={{
                    ...iosCard,
                    padding: 40,
                    textAlign: "center",
                    animation: ios.animation.scaleIn(),
                }}
            >
                <style>{allKeyframes}</style>
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
                    <IconAlertCircle size={26} color="var(--mantine-color-red-6)" />
                </Box>
                <Text fw={600} size="sm" mb={4}>
                    Failed to load encounter
                </Text>
                {error instanceof Error && (
                    <Text size="xs" c="dimmed" ta="center" maw={360} mx="auto" mb="md">
                        {error.message}
                    </Text>
                )}
                <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    radius="xl"
                    onClick={() => router.back()}
                >
                    Go back
                </Button>
            </Box>
        );
    }

    const color = encounterStatusColor(encounter.status);
    const duration = formatDuration(encounter.startedAt, encounter.endedAt);

    return (
        <Stack gap="xl">
            <style>{allKeyframes}</style>

            {/* Back + header */}
            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Button
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconArrowLeft size={14} />}
                    onClick={() => router.push("/doctor/encounters")}
                    mb="xs"
                    radius="xl"
                    style={{ fontWeight: 500 }}
                >
                    All encounters
                </Button>
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
                        <IconStethoscope size={20} />
                    </Box>
                    <Box>
                        <Text style={iosLargeTitle}>Encounter Details</Text>
                        <Text style={iosSubtitle}>
                            Review consultation details and add notes.
                        </Text>
                    </Box>
                </Group>
            </Box>

            {/* Patient info card */}
            <Box
                style={{
                    ...iosCard,
                    padding: 20,
                    animation: ios.animation.fadeSlideUp("100ms"),
                }}
            >
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
                            <Text fw={700} size="md">
                                {encounter.patientName}
                            </Text>
                            <Group gap={6}>
                                <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">
                                    {formatDateTime(encounter.startedAt)}
                                </Text>
                            </Group>
                            {duration && (
                                <Group gap={6}>
                                    <IconClock size={12} color="var(--mantine-color-dimmed)" />
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
                        radius="xl"
                        leftSection={<EncounterStatusIcon status={encounter.status} />}
                    >
                        {encounterStatusLabel(encounter.status)}
                    </Badge>
                </Group>
            </Box>

            {/* Notes section */}
            <Box
                style={{
                    ...iosCard,
                    padding: 20,
                    animation: ios.animation.fadeSlideUp("200ms"),
                }}
            >
                <Stack gap="md">
                    <Group gap="sm">
                        <Box
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <IconNotes size={16} color="var(--mantine-color-primary-6)" />
                        </Box>
                        <Text fw={600} size="sm">
                            Encounter Notes
                        </Text>
                    </Group>
                    <Textarea
                        placeholder="Add notes about this encounter..."
                        minRows={4}
                        maxRows={10}
                        autosize
                        radius={12}
                        value={currentNotes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        styles={{
                            input: {
                                border: "0.5px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1))",
                                transition: ios.transition.fast,
                            },
                        }}
                    />
                    <Group justify="flex-end">
                        <Button
                            size="sm"
                            radius="xl"
                            leftSection={<IconDeviceFloppy size={16} />}
                            loading={saveNotes.isPending}
                            disabled={currentNotes === (encounter.notes ?? "")}
                            onClick={() => saveNotes.mutate(currentNotes)}
                            style={{ fontWeight: 600 }}
                        >
                            Save Notes
                        </Button>
                    </Group>
                </Stack>
            </Box>
        </Stack>
    );
}
