"use client";

import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Group,
    Loader,
    Portal,
    Stack,
    Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconPhone,
    IconPhoneOff,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/ui/providers/auth-provider";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";
import type { IncomingCallEntry } from "@/lib/meet/use-doctor-call-queue";
import type { AttendeeJoinInfo } from "@/data/meet";
import { getInitials } from "@/lib/get-initials";

// ── Mutations (same as dashboard) ─────────────────────────────────────────────

function useAcceptCall() {
    return useMutation<AttendeeJoinInfo, Error, { requestId: string }>({
        mutationFn: async ({ requestId }) => {
            const res = await fetch(`/api/meet/${requestId}/accept`, {
                method: "POST",
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: { message?: string } };
                throw new Error(err.error?.message ?? "Failed to accept call");
            }
            return res.json() as Promise<AttendeeJoinInfo>;
        },
    });
}

function useRejectCall() {
    return useMutation<void, Error, { requestId: string }>({
        mutationFn: async ({ requestId }) => {
            const res = await fetch(`/api/meet/${requestId}/reject`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to reject call");
        },
    });
}

// ── Single iOS-style call toast ───────────────────────────────────────────────

function IncomingCallToast({
    call,
    index,
    total,
}: Readonly<{ call: IncomingCallEntry; index: number; total: number }>) {
    const router = useRouter();
    const accept = useAcceptCall();
    const reject = useRejectCall();
    const [joining, setJoining] = useState(false);

    if (reject.isPending || reject.isSuccess) return null;

    const handleAccept = () => {
        // Optimistic — show "Joining" instantly
        setJoining(true);
        accept.mutate(
            { requestId: call.requestId },
            {
                onSuccess: () => {
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
    };

    const isJoining = joining || call.status === "accepted" || accept.isSuccess;

    // Stack offset — each subsequent card is shifted up a bit
    const bottomOffset = 24 + index * 90;

    return (
        <Box
            style={{
                position: "fixed",
                bottom: bottomOffset,
                right: 24,
                zIndex: 9999,
                width: 320,
                borderRadius: 20,
                overflow: "hidden",
                // iOS-style frosted glass dark pill
                background: "light-dark(rgba(20,20,20,0.92), rgba(28,28,30,0.96))",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow:
                    "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.30), inset 0 0.5px 0 rgba(255,255,255,0.12)",
                animation: "ios-call-slide-in 0.35s cubic-bezier(0.34,1.36,0.64,1) both",
            }}
        >
            <style>{`
        @keyframes ios-call-slide-in {
          from { transform: translateX(calc(100% + 32px)); opacity: 0; }
          to   { transform: translateX(0);                 opacity: 1; }
        }
        @keyframes ios-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,199,89,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(52,199,89,0); }
        }
      `}</style>

            <Group px={14} py={12} justify="space-between" wrap="nowrap" gap={10}>
                {/* Left: avatar + text */}
                <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    {/* Avatar — photo if available, otherwise initials */}
                    <Box style={{ position: "relative", flexShrink: 0 }}>
                        <Avatar
                            size={44}
                            radius="xl"
                            src={call.patientPhotoUrl ?? undefined}
                            style={{
                                background: call.patientPhotoUrl
                                    ? undefined
                                    : "rgba(255,255,255,0.08)",
                                border: "2px solid rgba(255,255,255,0.12)",
                                borderRadius: "50%",
                                fontSize: 16,
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.85)",
                            }}
                        >
                            {!call.patientPhotoUrl && getInitials(call.patientName)}
                        </Avatar>
                        {/* iOS green call badge */}
                        <Box
                            style={{
                                position: "absolute",
                                bottom: -2,
                                right: -2,
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: "#34C759",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid rgba(20,20,20,0.9)",
                                animation: "ios-ring-pulse 1.5s ease-in-out infinite",
                            }}
                        >
                            <IconPhone size={9} color="#fff" />
                        </Box>
                    </Box>

                    <Stack gap={1} style={{ minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap" align="center">
                            <Text
                                size="sm"
                                fw={600}
                                lineClamp={1}
                                style={{ color: "rgba(255,255,255,0.95)" }}
                            >
                                {call.patientName}
                            </Text>
                            {total > 1 && index === 0 && (
                                <Badge
                                    size="xs"
                                    color="orange"
                                    variant="filled"
                                    style={{ flexShrink: 0, fontSize: 9 }}
                                >
                                    +{total - 1} more
                                </Badge>
                            )}
                        </Group>
                        <Text size="xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {isJoining ? "Joining…" : "Incoming video call"}
                        </Text>
                    </Stack>
                </Group>

                {/* Right: action buttons */}
                {isJoining ? (
                    <Group gap={6} wrap="nowrap">
                        <Box
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "rgba(52,199,89,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Loader size={18} color="#34C759" />
                        </Box>
                    </Group>
                ) : (
                    <Group gap={6} wrap="nowrap">
                        {/* Decline — red */}
                        <ActionIcon
                            size={40}
                            radius={40}
                            loading={reject.isPending}
                            onClick={handleReject}
                            aria-label="Decline call"
                            style={{
                                background: "#FF3B30",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                            }}
                        >
                            <IconPhoneOff size={18} />
                        </ActionIcon>

                        {/* Accept — green */}
                        <ActionIcon
                            size={40}
                            radius={40}
                            onClick={handleAccept}
                            aria-label="Accept call"
                            style={{
                                background: "#34C759",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                            }}
                        >
                            <IconPhone size={18} />
                        </ActionIcon>
                    </Group>
                )}
            </Group>
        </Box>
    );
}

// ── Root component — mounted in portal shell ──────────────────────────────────

export function IncomingCallNotifications() {
    const { user } = useAuth();
    const queue = useDoctorCallQueue(user?.uid);

    // Only show pending calls (not yet accepted/joining) in the toast stack;
    // limit to 3 visible toasts to avoid screen overflow.
    const pending = queue
        .filter((c) => c.status === "pending")
        .slice(0, 3);

    if (pending.length === 0) return null;

    return (
        <Portal>
            {pending.map((call, i) => (
                <IncomingCallToast
                    key={call.requestId}
                    call={call}
                    index={i}
                    total={pending.length}
                />
            ))}
        </Portal>
    );
}
