"use client";
import {
    ActionIcon,
    Alert,
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    Title,
    Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import {
    IconCheck,
    IconPhone,
    IconPhoneOff,
    IconUser,
    IconVideo,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/ui/providers/auth-provider";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";
import type { AttendeeJoinInfo } from "@/data/meet";
import { colors } from "@/ui/tokens";
import type { IncomingCallEntry } from "@/lib/meet/use-doctor-call-queue";
import { ios, iosCard, allKeyframes } from "@/ui/ios";
import { useMeetSession } from "@/lib/meet/meet-session-context";
import { meetSessionKey, type MeetSessionData } from "@/app/(portal)/meet/[requestId]/_keys";
import { buildConversationId } from "@/lib/messaging/conversation-id";

// ── Accept/Reject mutations ───────────────────────────────────────────────────

function useAcceptCall() {
    return useMutation<AttendeeJoinInfo, Error, { requestId: string }>({
        mutationFn: async ({ requestId }) => {
            const res = await fetch(`/api/meet/${requestId}/accept`, {
                method: "POST",
            });
            if (!res.ok) {
                const err = (await res.json()) as {
                    error?: { message?: string };
                };
                throw new Error(err.error?.message ?? "Failed to accept call");
            }
            return res.json() as Promise<AttendeeJoinInfo>;
        },
    });
}

function useRejectCall() {
    return useMutation<void, Error, { requestId: string }>({
        mutationFn: async ({ requestId }) => {
            const res = await fetch(`/api/meet/${requestId}/reject`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Failed to reject call");
        },
    });
}

// ── Single incoming call card ─────────────────────────────────────────────────

function IncomingCallCard({
    call,
}: Readonly<{ call: IncomingCallEntry }>) {
    const router = useRouter();
    const { user } = useAuth();
    const { startMeet } = useMeetSession();
    const queryClient = useQueryClient();
    const accept = useAcceptCall();
    const reject = useRejectCall();
    const [joining, setJoining] = useState(false);

    // Optimistically hide the card the moment the doctor confirms rejection
    // so the UI feels instant — RTDB propagation catches up in the background.
    if (reject.isPending || reject.isSuccess) return null;

    const handleAccept = () => {
        // Optimistic — show "Joining" instantly
        setJoining(true);
        accept.mutate(
            { requestId: call.requestId },
            {
                onSuccess: (joinInfo) => {
                    // Build session data from accept response + call metadata
                    const sessionData: MeetSessionData = {
                        requestId: call.requestId,
                        joinInfo,
                        localUser: {
                            name: user?.displayName ?? "Doctor",
                            photoUrl: user?.photoURL ?? null,
                        },
                        remoteUser: {
                            name: call.patientName,
                            photoUrl: call.patientPhotoUrl ?? null,
                        },
                        exitRoute: "/doctor/dashboard",
                        userKind: "doctor",
                        localUserId: user!.uid,
                        doctorId: user!.uid,
                        conversationId: buildConversationId(
                            user!.uid,
                            call.patientId,
                        ),
                        patientId: call.patientId,
                    };
                    // Seed TanStack cache for /meet page revisits
                    queryClient.setQueryData(
                        meetSessionKey(call.requestId),
                        sessionData,
                    );
                    // Start room overlay immediately — skip SSR + lobby
                    startMeet(sessionData);
                    // Update URL for state consistency
                    router.push(`/meet/${call.requestId}`);
                },
                onError: (err) => {
                    setJoining(false);
                    notifications.show({
                        title: "Could not accept",
                        message: err.message,
                        color: "red",
                        icon: <IconX size={18} />,
                    });
                },
            },
        );
    };

    const handleReject = () => {
        modals.openConfirmModal({
            title: "Decline call",
            children: (
                <Text size="sm">
                    Are you sure you want to decline{" "}
                    <Text component="span" fw={600}>
                        {call.patientName}&apos;s
                    </Text>{" "}
                    call?
                </Text>
            ),
            labels: { confirm: "Decline", cancel: "Cancel" },
            confirmProps: { color: "red" },
            closeOnConfirm: true,
            onConfirm: () => {
                reject.mutate(
                    { requestId: call.requestId },
                    {
                        onSuccess: () => {
                            notifications.show({
                                title: "Call declined",
                                message: `${call.patientName}'s call was declined.`,
                                color: "gray",
                                icon: <IconCheck size={18} />,
                            });
                        },
                        onError: () => {
                            notifications.show({
                                title: "Could not decline",
                                message: "Failed to decline the call. Please try again.",
                                color: "red",
                                icon: <IconX size={18} />,
                            });
                        },
                    },
                );
            },
        });
    };

    const waitSeconds = Math.floor((Date.now() - call.createdAt) / 1000);
    const waitLabel =
        waitSeconds < 60
            ? `${waitSeconds}s`
            : `${Math.floor(waitSeconds / 60)}m ${waitSeconds % 60}s`;

    return (
        <Paper
            radius={16}
            p="md"
            style={{
                background:
                    "light-dark(rgba(99,102,241,0.04), rgba(99,102,241,0.08))",
                border:
                    "0.5px solid light-dark(rgba(99,102,241,0.15), rgba(99,102,241,0.25))",
                animation: "ios-call-pulse 2s ease-in-out infinite",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(99,102,241,0.08)",
                transition: ios.transition.spring,
            }}
        >
            <style>{`
        @keyframes ios-call-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
        }
      `}</style>

            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar radius="xl" color="primary">
                        <IconUser size={18} />
                    </Avatar>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" wrap="nowrap">
                            <Text fw={600} size="sm" lineClamp={1}>
                                {call.patientName}
                            </Text>
                            <Badge size="xs" color="yellow" variant="dot">
                                Waiting {waitLabel}
                            </Badge>
                        </Group>
                    </Stack>
                </Group>

                <Group gap="xs" wrap="nowrap">
                    {/* When the call has been accepted (RTDB updated) show a
                        joining spinner while the router navigates to /meet. */}
                    {joining || call.status === "accepted" || accept.isSuccess ? (
                        <Group gap="xs" wrap="nowrap">
                            <Loader size="sm" color={colors.success} />
                            <Text size="sm" c={`${colors.success}.6`} fw={500}>
                                Joining…
                            </Text>
                        </Group>
                    ) : (
                        <>
                            <Tooltip label="Reject" position="top">
                                <ActionIcon
                                    size="lg"
                                    radius="xl"
                                    color="red"
                                    variant="light"
                                    loading={reject.isPending}
                                    onClick={handleReject}
                                    style={{
                                        transition: ios.transition.fast,
                                    }}
                                >
                                    <IconPhoneOff size={18} />
                                </ActionIcon>
                            </Tooltip>
                            <Button
                                leftSection={<IconVideo size={16} />}
                                color={colors.success}
                                variant="filled"
                                size="sm"
                                radius="xl"
                                onClick={handleAccept}
                                style={{
                                    transition: ios.transition.fast,
                                    fontWeight: 600,
                                }}
                            >
                                Accept
                            </Button>
                        </>
                    )}
                </Group>
            </Group>
        </Paper>
    );
}

// ── Call queue ────────────────────────────────────────────────────────────────

export function DoctorCallQueue() {
    const { user } = useAuth();
    const queue = useDoctorCallQueue(user?.uid);

    if (queue.length === 0) return null;

    return (
        <Box>
            <style>{allKeyframes}</style>
            <Group gap="xs" mb="sm">
                <Box
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "light-dark(rgba(255,152,0,0.1), rgba(255,152,0,0.15))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <IconPhone size={16} color="var(--mantine-color-orange-5)" />
                </Box>
                <Text fw={600} size="md" c="orange">
                    Incoming Calls
                </Text>
                <Badge color="orange" variant="filled" size="sm" radius="xl" style={{ minWidth: 22 }}>
                    {queue.length}
                </Badge>
            </Group>
            <Stack gap="sm">
                {queue.map((call, index) => (
                    <Box key={call.requestId} style={{ animation: ios.animation.scaleIn(ios.stagger(index)) }}>
                        <IncomingCallCard call={call} />
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}

// ── Loading placeholder ───────────────────────────────────────────────────────

export function CallQueueLoader() {
    return (
        <Alert
            icon={<Loader size={14} />}
            color="primary"
            variant="light"
            radius="lg"
            title="Listening for incoming calls"
        >
            You will see patient call requests here in real-time.
        </Alert>
    );
}
