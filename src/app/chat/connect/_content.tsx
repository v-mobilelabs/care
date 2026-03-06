"use client";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Transition,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconCheck,
    IconClock,
    IconPhoneOff,
    IconRefresh,
    IconStethoscope,
    IconVideo,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { useCallState } from "@/lib/meet/use-call-state";
import { useQueueSize } from "@/lib/meet/use-queue-size";
import { useMeetSession } from "@/lib/meet/meet-session-context";
import { colors } from "@/ui/tokens";
import {
    useOnlineDoctors,
    useInitiateCall,
    useCancelCall,
} from "./_query";
import type { OnlineDoctorDto } from "@/data/meet/use-cases/list-online-doctors.use-case";

// ── Single doctor card ────────────────────────────────────────────────────────

function DoctorCard({
    doctor,
    onConnect,
    connecting,
}: Readonly<{
    doctor: OnlineDoctorDto;
    onConnect: (doctorId: string) => void;
    connecting: boolean;
}>) {
    const presence = usePresenceStatus(doctor.uid);
    const queueSize = useQueueSize(doctor.uid);
    const [hovered, setHovered] = useState(false);
    const isBusy = presence.online && presence.status === "busy";

    return (
        <Paper
            withBorder
            radius="lg"
            p="lg"
            style={{
                transition: "box-shadow 200ms ease",
                boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.1)" : undefined,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <Box pos="relative" style={{ flexShrink: 0 }}>
                            <Avatar
                                size="sm"
                                src={doctor.photoUrl}
                                radius="xl"
                                color="primary"
                            >
                                {doctor.name.slice(0, 2).toUpperCase()}
                            </Avatar>
                            {/* Online dot — shown when RTDB presence is active */}
                            {presence.online && (
                                <Box
                                    pos="absolute"
                                    style={{
                                        bottom: 0,
                                        right: 0,
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: isBusy
                                            ? "var(--mantine-color-orange-5)"
                                            : "var(--mantine-color-teal-5)",
                                        border: "2px solid var(--mantine-color-body)",
                                    }}
                                />
                            )}
                        </Box>
                        <Stack gap={2}>
                            <Text fw={600} size="sm" lineClamp={1}>
                                Dr. {doctor.name}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                                {doctor.specialty}
                            </Text>
                        </Stack>
                    </Group>
                    <Badge
                        color={isBusy ? colors.warning : colors.success}
                        variant="light"
                        size="xs"
                    >
                        {isBusy ? "On a call" : "Available"}
                    </Badge>
                </Group>
                {doctor.bio && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                        {doctor.bio}
                    </Text>
                )}
                {queueSize > 0 ? (
                    <Group gap={6} align="center">
                        <IconClock size={13} color={`var(--mantine-color-${colors.warning}-5)`} />
                        <Text size="xs" c={colors.warning} fw={500}>
                            {queueSize} {queueSize === 1 ? "patient" : "patients"} waiting
                        </Text>
                    </Group>
                ) : (
                    <Group gap={6} align="center">
                        <IconCheck size={13} color={`var(--mantine-color-${colors.success}-5)`} />
                        <Text size="xs" c={colors.success} fw={500}>
                            No wait — connect instantly
                        </Text>
                    </Group>
                )}
                <Button
                    leftSection={<IconVideo size={16} />}
                    color="primary"
                    variant="filled"
                    size="sm"
                    fullWidth
                    loading={connecting}
                    onClick={() => onConnect(doctor.uid)}
                >
                    {isBusy ? "Join Queue" : "Connect Now"}
                </Button>
            </Stack>
        </Paper>
    );
}

// ── Waiting room banner ───────────────────────────────────────────────────────

function WaitingRoom({
    requestId,
    queuePosition,
    doctorName,
    onCancel,
}: Readonly<{ requestId: string; queuePosition?: number; doctorName?: string; onCancel: () => void }>) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");

    return (
        <Paper
            withBorder
            radius="lg"
            p="xl"
            style={{
                background:
                    "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.08))",
                border:
                    "1px solid light-dark(var(--mantine-color-primary-2), rgba(107,79,248,0.2))",
            }}
        >
            <Stack align="center" gap="md">
                <ThemeIcon size={56} radius="xl" color="primary" variant="light">
                    <Loader size={28} color="primary" />
                </ThemeIcon>
                <Stack gap={4} align="center">
                    <Title order={4}>Waiting for {doctorName ? `Dr. ${doctorName}` : "doctor"}…</Title>
                    {queuePosition != null && queuePosition > 0 && (
                        <Badge size="lg" radius="md" color="primary" variant="light">
                            #{queuePosition} in queue
                        </Badge>
                    )}
                    <Text c="dimmed" size="sm">
                        You&apos;ve been waiting for{" "}
                        <Text component="span" fw={600} c="primary">
                            {mins}:{secs}
                        </Text>
                    </Text>
                    <Text c="dimmed" size="xs">
                        {queuePosition != null && queuePosition > 1
                            ? `There are ${queuePosition - 1} patient(s) ahead of you.`
                            : "You\u2019re next! The doctor will join shortly."}
                    </Text>
                </Stack>
                <Button
                    variant="subtle"
                    color="red"
                    leftSection={<IconPhoneOff size={16} />}
                    onClick={onCancel}
                    size="sm"
                >
                    Cancel call
                </Button>
                <Text size="xs" c="dimmed" fs="italic">
                    Request ID: {requestId ? requestId.slice(0, 8) : "—"}…
                </Text>
            </Stack>
        </Paper>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function ConnectContent() {
    const { user } = useAuth();
    const router = useRouter();
    const { data: doctors, isLoading, refetch } = useOnlineDoctors();
    const callState = useCallState(user?.uid);
    const initiate = useInitiateCall();
    const cancel = useCancelCall();
    const [connectingDoctorId, setConnectingDoctorId] = useState<string | null>(null);
    const prevStatusRef = useRef(callState.status);
    // Set to true when the patient deliberately cancels so the pending→idle
    // transition doesn't mistakenly show a "call declined" notification.
    const cancelledByPatientRef = useRef(false);

    // ── Guard: don't auto-navigate if the user just ended a call ─────────
    // When endMeet() clears the overlay and we navigate here, the RTDB
    // call-state node may still briefly show "accepted" until the server
    // end-call API completes. Without this guard the stale status would
    // redirect us straight back to the meet lobby.
    const { state: meetState } = useMeetSession();

    // When call is accepted, navigate to the video room — but only if the
    // MeetSessionProvider does not already have an active session (which
    // means the call was just ended locally).
    useEffect(() => {
        if (
            callState.status === "accepted" &&
            callState.requestId &&
            !meetState.sessionData
        ) {
            router.push(`/meet/${callState.requestId}`);
        }
    }, [callState.status, callState.requestId, meetState.sessionData, router]);

    // Show "declined" notification when the call transitions from pending → idle.
    // The server removes the call-state RTDB node on rejection so the patient's
    // state cleanly goes back to idle. We track the previous status via a ref so
    // we can distinguish a natural idle (page load) from a server-driven close.
    useEffect(() => {
        const prev = prevStatusRef.current;
        prevStatusRef.current = callState.status;

        if (prev === "pending" && callState.status === "idle") {
            if (!cancelledByPatientRef.current) {
                notifications.show({
                    title: "Call declined",
                    message: "The doctor is busy right now. Please try another available doctor.",
                    color: "red",
                    icon: <IconX size={18} />,
                });
            }
            cancelledByPatientRef.current = false;
        }
    }, [callState.status]);

    const handleConnect = (doctorId: string) => {
        setConnectingDoctorId(doctorId);
        initiate.mutate(
            { doctorId },
            {
                onError: (err) => {
                    notifications.show({
                        title: "Failed to connect",
                        message: err.message,
                        color: colors.danger,
                        icon: <IconAlertCircle size={18} />,
                    });
                    setConnectingDoctorId(null);
                },
                onSuccess: () => setConnectingDoctorId(null),
            },
        );
    };

    const handleCancel = () => {
        if (!callState.requestId) return;
        cancelledByPatientRef.current = true;
        cancel.mutate(
            { requestId: callState.requestId },
            {
                onSuccess: () => {
                    notifications.show({
                        title: "Call cancelled",
                        message: "Your call request has been cancelled.",
                        color: "gray",
                        icon: <IconCheck size={18} />,
                    });
                },
                onError: () => {
                    // Cancel failed — reset flag so a subsequent doctor rejection
                    // still shows the "Call declined" notification correctly.
                    cancelledByPatientRef.current = false;
                },
            },
        );
    };

    const availableDoctors = doctors ?? [];
    const isPending = callState.status === "pending";
    const doctorCountLabel = (() => {
        if (isLoading) return "Loading available doctors\u2026";
        const suffix = availableDoctors.length === 1 ? "" : "s";
        return `${availableDoctors.length} doctor${suffix} available`;
    })();

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconStethoscope size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>Connect to a Doctor</Title>
                            <Text size="xs" c="dimmed">
                                {isPending ? "Waiting for a doctor to join…" : doctorCountLabel}
                            </Text>
                        </Box>
                    </Group>
                    {!isPending && (
                        <Button
                            variant="light"
                            size="sm"
                            color="primary"
                            leftSection={<IconRefresh size={15} />}
                            onClick={async () => { await refetch(); }}
                            loading={isLoading}
                        >
                            Refresh
                        </Button>
                    )}
                </Group>
            </Box>

            {/* Content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                        {/* Waiting room — shown while waiting */}
                        <Transition mounted={isPending} transition="fade" duration={300}>
                            {(style) => (
                                <div style={style}>
                                    <WaitingRoom
                                        requestId={callState.requestId ?? ""}
                                        queuePosition={callState.queuePosition}
                                        doctorName={callState.doctorName}
                                        onCancel={handleCancel}
                                    />
                                </div>
                            )}
                        </Transition>

                        {/* Doctors list — hidden while pending */}
                        {!isPending && (
                            <Stack gap="md">
                                {isLoading && (
                                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton key={n} height={160} radius="lg" />
                                        ))}
                                    </SimpleGrid>
                                )}

                                {!isLoading && availableDoctors.length === 0 && (
                                    <Box py={80} style={{ textAlign: "center" }}>
                                        <ThemeIcon size={64} radius="xl" color="primary" variant="light" mx="auto" mb="md">
                                            <IconStethoscope size={32} />
                                        </ThemeIcon>
                                        <Text fw={600} size="sm" mb={6}>No doctors available</Text>
                                        <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6}>
                                            There are no doctors online right now. Please try again later or
                                            check back in a few minutes.
                                        </Text>
                                    </Box>
                                )}

                                {!isLoading && availableDoctors.length > 0 && (
                                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                        {availableDoctors.map((doctor) => (
                                            <DoctorCard
                                                key={doctor.uid}
                                                doctor={doctor}
                                                onConnect={handleConnect}
                                                connecting={
                                                    initiate.isPending && connectingDoctorId === doctor.uid
                                                }
                                            />
                                        ))}
                                    </SimpleGrid>
                                )}
                            </Stack>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
