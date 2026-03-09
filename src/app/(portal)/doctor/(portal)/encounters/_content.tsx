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
    IconChevronRight,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EncounterDto, EncounterStatus } from "@/data/encounters";
import { colors } from "@/ui/tokens";
import { apiFetch } from "@/lib/api/fetch";
import { iosCard, iosGroupedCard, iosRow, iosRowLast, iosLargeTitle, iosSubtitle, ios, allKeyframes } from "@/ui/ios";

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

// ── iOS Encounter row ─────────────────────────────────────────────────────────

function EncounterRow({
    encounter,
    isLast,
    index,
    onClick,
}: Readonly<{ encounter: EncounterDto; isLast: boolean; index: number; onClick?: () => void }>) {
    const date = new Date(encounter.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
    const time = new Date(encounter.startedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    const duration = formatDuration(encounter.startedAt, encounter.endedAt);
    const color = encounterStatusColor(encounter.status);

    return (
        <Box
            style={{
                ...(isLast ? iosRowLast : iosRow),
                paddingLeft: 16,
                paddingRight: 16,
                cursor: onClick ? "pointer" : undefined,
                animation: ios.animation.fadeSlideUp(ios.stagger(index)),
                transition: ios.transition.fast,
            }}
            onClick={onClick}
        >
            <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar
                        size={44}
                        radius="xl"
                        color="secondary"
                        variant="light"
                        src={encounter.patientPhotoUrl}
                    >
                        {getInitials(encounter.patientName)}
                    </Avatar>
                    <Stack gap={2} style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" truncate>
                            {encounter.patientName}
                        </Text>
                        <Group gap={6} wrap="nowrap">
                            <Text size="xs" c="dimmed">{date} · {time}</Text>
                            {duration && (
                                <Text size="xs" c={`${colors.success}.6`} fw={500}>
                                    {duration}
                                </Text>
                            )}
                        </Group>
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

                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Badge
                        color={color}
                        variant="light"
                        size="sm"
                        radius="xl"
                        leftSection={<EncounterStatusIcon status={encounter.status} />}
                    >
                        {encounterStatusLabel(encounter.status)}
                    </Badge>
                    {encounter.durationSeconds != null && encounter.durationSeconds > 0 && (
                        <Text size="xs" c="dimmed">
                            {Math.floor(encounter.durationSeconds / 60)}m
                        </Text>
                    )}
                    <IconChevronRight size={16} color="var(--mantine-color-dimmed)" style={{ opacity: 0.5 }} />
                </Group>
            </Group>
        </Box>
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
                        <IconStethoscope size={20} />
                    </Box>
                    <Box>
                        <Text style={iosLargeTitle}>Encounters</Text>
                        <Text style={iosSubtitle}>
                            All patient encounters from video consultations.
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
                                <IconAlertCircle size={26} color="var(--mantine-color-red-6)" />
                            </Box>
                            <Text fw={600} size="sm" mb={4}>Failed to load encounters</Text>
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

                if (!encounters || encounters.length === 0) {
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
                                <IconStethoscope size={32} color="var(--mantine-color-primary-5)" />
                            </Box>
                            <Text fw={600} size="md" mb={6}>No encounters yet</Text>
                            <Text size="sm" c="dimmed" maw={320} mx="auto">
                                Encounters are created automatically when you connect with patients via video call.
                            </Text>
                        </Box>
                    );
                }

                return (
                    <Box>
                        <Text size="xs" c="dimmed" fw={500} mb="sm" px={4} style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 11 }}>
                            {encounters.length} encounter{encounters.length === 1 ? "" : "s"}
                        </Text>
                        <Box style={iosGroupedCard}>
                            {encounters.map((enc, index) => (
                                <EncounterRow
                                    key={enc.id}
                                    encounter={enc}
                                    isLast={index === encounters.length - 1}
                                    index={index}
                                    onClick={() => router.push(`/doctor/encounters/${enc.id}`)}
                                />
                            ))}
                        </Box>
                    </Box>
                );
            })()}
        </Stack>
    );
}
