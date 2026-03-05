"use client";
import {
    Alert,
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    ScrollArea,
    SimpleGrid,
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
    IconPhone,
    IconPhoneOff,
    IconRefresh,
    IconStethoscope,
    IconVideo,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { useCallState } from "@/lib/meet/use-call-state";
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
    const { online } = usePresenceStatus(doctor.uid);

    return (
        <Paper withBorder radius="lg" p="lg" style={{ transition: "box-shadow 0.15s" }}>
            <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <Box pos="relative" style={{ flexShrink: 0 }}>
                            <Avatar
                                size="md"
                                src={doctor.photoUrl}
                                radius="xl"
                                color="primary"
                            >
                                {doctor.name.slice(0, 2).toUpperCase()}
                            </Avatar>
                            {/* Online dot — shown when RTDB presence is active */}
                            {online && (
                                <Box
                                    pos="absolute"
                                    style={{
                                        bottom: 1,
                                        right: 1,
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: "var(--mantine-color-teal-5)",
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
                    <Badge color={colors.success} variant="light" size="sm">
                        Available
                    </Badge>
                </Group>
                {doctor.bio && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                        {doctor.bio}
                    </Text>
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
                    Connect Now
                </Button>
            </Stack>
        </Paper>
    );
}

// ── Waiting room banner ───────────────────────────────────────────────────────

function WaitingRoom({
    requestId,
    onCancel,
}: Readonly<{ requestId: string; onCancel: () => void }>) {
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
                    <Title order={4}>Waiting for doctor…</Title>
                    <Text c="dimmed" size="sm">
                        You&apos;ve been in the queue for{" "}
                        <Text component="span" fw={600} c="primary">
                            {mins}:{secs}
                        </Text>
                    </Text>
                    <Text c="dimmed" size="xs">
                        The doctor will join shortly. Please keep this page open.
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
                    Request ID: {requestId.slice(0, 8)}…
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

    // When call is accepted, navigate to the video room
    useEffect(() => {
        if (callState.status === "accepted" && callState.requestId) {
            router.push(`/meet/${callState.requestId}`);
        }
    }, [callState.status, callState.requestId, router]);

    // When rejected, show notification
    useEffect(() => {
        if (callState.status === "rejected") {
            notifications.show({
                title: "Call declined",
                message: "The doctor is busy right now. Please try another available doctor.",
                color: "red",
                icon: <IconX size={18} />,
            });
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
            },
        );
    };

    // Compute online doctors (those with presence "available")
    const availableDoctors = doctors ?? [];
    const isPending = callState.status === "pending";

    return (
        <Stack gap="lg">
            {/* Header */}
            <Box>
                <Group gap="sm" mb={4}>
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconPhone size={20} />
                    </ThemeIcon>
                    <Title order={2}>Connect to a Doctor</Title>
                </Group>
                <Text c="dimmed" size="sm">
                    Start an instant video consultation with a doctor who is online right
                    now.
                </Text>
            </Box>

            {/* Waiting room — shown while waiting */}
            <Transition mounted={isPending} transition="fade" duration={300}>
                {(style) => (
                    <div style={style}>
                        <WaitingRoom
                            requestId={callState.requestId!}
                            onCancel={handleCancel}
                        />
                    </div>
                )}
            </Transition>

            {/* Doctors list — hidden while pending */}
            {!isPending && (
                <>
                    <Group justify="space-between">
                        <Text size="sm" fw={500} c="dimmed">
                            {isLoading
                                ? "Loading available doctors…"
                                : `${availableDoctors.filter(() => true).length} doctor${availableDoctors.length !== 1 ? "s" : ""} available`}
                        </Text>
                        <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconRefresh size={14} />}
                            onClick={() => void refetch()}
                            loading={isLoading}
                        >
                            Refresh
                        </Button>
                    </Group>

                    {isLoading && (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            {[1, 2, 3].map((n) => (
                                <Paper key={n} withBorder radius="lg" p="lg" h={160}>
                                    <Loader size="sm" />
                                </Paper>
                            ))}
                        </SimpleGrid>
                    )}

                    {!isLoading && availableDoctors.length === 0 && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            color="gray"
                            radius="lg"
                            title="No doctors available"
                        >
                            There are no doctors online right now. Please try again later or
                            check back in a few minutes.
                        </Alert>
                    )}

                    {!isLoading && availableDoctors.length > 0 && (
                        <ScrollArea>
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
                        </ScrollArea>
                    )}
                </>
            )}
        </Stack>
    );
}
