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
    Tooltip,
} from "@mantine/core";
import {
    IconStethoscope,
    IconClock,
    IconCalendar,
    IconPlayerPlay,
    IconUser,
    IconCheck,
    IconLoader,
    IconNotes,
    IconAlertCircle,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EncounterDto, EncounterStatus } from "@/data/encounters";
import { colors } from "@/ui/tokens";
import { apiFetch } from "@/lib/api/fetch";

// ── Status helpers ────────────────────────────────────────────────────────────

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

function formatDuration(startedAt: string, endedAt?: string): string | null {
    if (!endedAt) return null;
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
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

// ── Encounter card ────────────────────────────────────────────────────────────

function EncounterCard({
    encounter,
    onClick,
}: Readonly<{ encounter: EncounterDto; onClick?: () => void }>) {
    const date = new Date(encounter.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const time = new Date(encounter.startedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    const duration = formatDuration(encounter.startedAt, encounter.endedAt);
    const color = encounterStatusColor(encounter.status);

    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{ overflow: "hidden", cursor: onClick ? "pointer" : undefined }}
            onClick={onClick}
        >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                {/* Left: avatar + info */}
                <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Box pos="relative">
                        <Avatar
                            size={48}
                            radius="xl"
                            color="secondary"
                            variant="light"
                            src={encounter.patientPhotoUrl}
                        >
                            {getInitials(encounter.patientName)}
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
                                <EncounterStatusIcon status={encounter.status} />
                            </Box>
                        </Box>
                    </Box>

                    <Stack gap={4} style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                            <IconUser size={12} color="var(--mantine-color-dimmed)" />
                            <Text fw={700} size="sm" truncate>
                                {encounter.patientName}
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
                                <IconPlayerPlay
                                    size={11}
                                    color={`var(--mantine-color-${colors.success}-6)`}
                                />
                                <Text size="xs" c={`${colors.success}.6`} fw={500}>
                                    {duration}
                                </Text>
                            </Group>
                        )}
                        {encounter.notes && (
                            <Tooltip label="Has notes" withArrow>
                                <Group gap={4} wrap="nowrap">
                                    <IconNotes size={11} color="var(--mantine-color-dimmed)" />
                                    <Text size="xs" c="dimmed" truncate maw={200}>
                                        {encounter.notes}
                                    </Text>
                                </Group>
                            </Tooltip>
                        )}
                    </Stack>
                </Group>

                {/* Right: badge */}
                <Stack gap={6} align="flex-end" style={{ flexShrink: 0 }}>
                    <Badge
                        color={color}
                        variant="light"
                        size="sm"
                        leftSection={<EncounterStatusIcon status={encounter.status} />}
                    >
                        {encounterStatusLabel(encounter.status)}
                    </Badge>
                    {encounter.durationSeconds != null && encounter.durationSeconds > 0 && (
                        <Group gap={4} wrap="nowrap">
                            <IconClock size={11} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed">
                                {Math.floor(encounter.durationSeconds / 60)}m{" "}
                                {encounter.durationSeconds % 60}s
                            </Text>
                        </Group>
                    )}
                </Stack>
            </Group>
        </Paper>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DoctorEncountersContent() {
    const {
        data: encounters,
        isLoading,
        error,
    } = useQuery<EncounterDto[]>({
        queryKey: ["encounters"],
        queryFn: () => apiFetch<EncounterDto[]>("/api/encounters"),
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
                        <IconStethoscope size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={3} fw={700}>
                            Encounters
                        </Title>
                        <Text c="dimmed" size="xs">
                            All patient encounters created from video consultations.
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
                                <ThemeIcon
                                    size={52}
                                    radius="xl"
                                    color="red"
                                    variant="light"
                                >
                                    <IconAlertCircle size={26} />
                                </ThemeIcon>
                                <Stack gap={4} align="center">
                                    <Text fw={700} size="sm">
                                        Failed to load encounters
                                    </Text>
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
                                    onClick={() =>
                                        startTransition(() => router.refresh())
                                    }
                                >
                                    Try again
                                </Button>
                            </Stack>
                        </Paper>
                    );
                }

                if (!encounters || encounters.length === 0) {
                    return (
                        <Paper
                            withBorder
                            radius="lg"
                            p="xl"
                            style={{
                                background:
                                    "light-dark(var(--mantine-color-primary-0), rgba(99,102,241,0.06))",
                            }}
                        >
                            <Stack align="center" gap="md" py="xl">
                                <ThemeIcon
                                    size={64}
                                    radius="xl"
                                    color="primary"
                                    variant="light"
                                >
                                    <IconStethoscope size={32} />
                                </ThemeIcon>
                                <Stack gap={6} align="center">
                                    <Title order={4}>No encounters yet</Title>
                                    <Text
                                        size="sm"
                                        c="dimmed"
                                        ta="center"
                                        maw={320}
                                    >
                                        Encounters are created automatically when
                                        you connect with patients via video call.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Paper>
                    );
                }

                return (
                    <Stack gap="sm">
                        <Text size="xs" c="dimmed" fw={500}>
                            {encounters.length} encounter
                            {encounters.length === 1 ? "" : "s"}
                        </Text>
                        {encounters.map((enc) => (
                            <EncounterCard
                                key={enc.id}
                                encounter={enc}
                                onClick={() =>
                                    router.push(
                                        `/doctor/encounters/${enc.id}`,
                                    )
                                }
                            />
                        ))}
                    </Stack>
                );
            })()}
        </Stack>
    );
}
