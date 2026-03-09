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
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/ui/providers/auth-provider";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";
import type { IncomingCallEntry } from "@/lib/meet/use-doctor-call-queue";
import type { AttendeeJoinInfo } from "@/data/meet";
import { getInitials } from "@/lib/get-initials";
import { useMeetSession } from "@/lib/meet/meet-session-context";
import { meetSessionKey, type MeetSessionData } from "@/app/meet/[requestId]/_keys";
import { buildConversationId } from "@/lib/messaging/conversation-id";
import { useCallRingtone } from "@/lib/meet/use-call-ringtone";

// ── Keyframe styles (injected once) ──────────────────────────────────────────

const IOS_KEYFRAMES = `
@keyframes iosSlideUp {
  0%   { transform: translateY(40px) scale(0.92); opacity: 0; }
  60%  { transform: translateY(-6px) scale(1.01); opacity: 1; }
  80%  { transform: translateY(2px)  scale(0.995); }
  100% { transform: translateY(0)    scale(1); opacity: 1; }
}
@keyframes iosSlideOut {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-20px) scale(0.94); opacity: 0; }
}
@keyframes iosRingPulse {
  0%   { box-shadow: 0 0 0 0 rgba(52,199,89,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(52,199,89,0); }
  100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); }
}
@keyframes iosPhoneWobble {
  0%, 100% { transform: rotate(0deg); }
  10%      { transform: rotate(14deg); }
  20%      { transform: rotate(-12deg); }
  30%      { transform: rotate(10deg); }
  40%      { transform: rotate(-8deg); }
  50%      { transform: rotate(5deg); }
  60%      { transform: rotate(-3deg); }
  70%      { transform: rotate(0deg); }
}
@keyframes iosAcceptGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52,199,89,0.4), 0 0 12px rgba(52,199,89,0.15); }
  50%      { box-shadow: 0 0 0 6px rgba(52,199,89,0), 0 0 20px rgba(52,199,89,0.3); }
}
@keyframes iosDeclineGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(255,59,48,0.1); }
  50%      { box-shadow: 0 0 14px rgba(255,59,48,0.25); }
}
@keyframes iosShimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes iosExpandRing1 {
  0%   { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes iosExpandRing2 {
  0%   { transform: scale(1); opacity: 0.35; }
  100% { transform: scale(2.6); opacity: 0; }
}
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

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
    const { user } = useAuth();
    const { startMeet } = useMeetSession();
    const queryClient = useQueryClient();
    const accept = useAcceptCall();
    const reject = useRejectCall();
    const [joining, setJoining] = useState(false);
    const [exiting, setExiting] = useState(false);

    if (exiting) return null;
    if (reject.isSuccess) return null;

    const handleAccept = () => {
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
        reject.mutate(
            { requestId: call.requestId },
            {
                onSuccess: () => {
                    setExiting(true);
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

    // Stack offset — each subsequent card is shifted up
    const bottomOffset = 20 + index * 78;

    return (
        <Box
            style={{
                position: "fixed",
                bottom: bottomOffset,
                right: 20,
                zIndex: 9999,
                width: 300,
                borderRadius: 18,
                overflow: "hidden",
                // iOS frosted glass pill
                background: "light-dark(rgba(20,20,20,0.92), rgba(28,28,30,0.96))",
                backdropFilter: "blur(40px) saturate(180%)",
                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                boxShadow:
                    "0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.14)",
                animationName: isJoining ? "iosSlideOut" : "iosSlideUp",
                animationDuration: isJoining ? "0.3s" : "0.5s",
                animationTimingFunction: isJoining ? "ease-in" : "cubic-bezier(0.34,1.56,0.64,1)",
                animationFillMode: isJoining ? "forwards" : "both",
                animationDelay: isJoining ? "0s" : `${index * 0.08}s`,
            }}
        >
            {/* Shimmer highlight sweep */}
            <Box
                style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    borderRadius: 18,
                    pointerEvents: "none",
                }}
            >
                <Box
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "50%",
                        height: "100%",
                        background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                        animationName: "iosShimmer",
                        animationDuration: "3s",
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                        animationDelay: "1s",
                    }}
                />
            </Box>

            <Group px={12} py={10} justify="space-between" wrap="nowrap" gap={8}>
                {/* Left: avatar + text */}
                <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    {/* Avatar with expanding pulse rings */}
                    <Box style={{ position: "relative", flexShrink: 0 }}>
                        {/* Expanding ring 1 */}
                        {!isJoining && (
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: -4,
                                    borderRadius: "50%",
                                    border: "1.5px solid rgba(52,199,89,0.4)",
                                    animation: "iosExpandRing1 2s ease-out infinite",
                                }}
                            />
                        )}
                        {/* Expanding ring 2 (delayed) */}
                        {!isJoining && (
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: -4,
                                    borderRadius: "50%",
                                    border: "1.5px solid rgba(52,199,89,0.25)",
                                    animation: "iosExpandRing2 2s ease-out 0.6s infinite",
                                }}
                            />
                        )}
                        <Avatar
                            size={38}
                            radius="xl"
                            src={call.patientPhotoUrl ?? undefined}
                            style={{
                                background: call.patientPhotoUrl
                                    ? undefined
                                    : "rgba(255,255,255,0.08)",
                                border: "2px solid rgba(255,255,255,0.14)",
                                borderRadius: "50%",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.85)",
                            }}
                        >
                            {!call.patientPhotoUrl && getInitials(call.patientName)}
                        </Avatar>
                        {/* iOS green call badge with wobble */}
                        <Box
                            style={{
                                position: "absolute",
                                bottom: -2,
                                right: -2,
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#34C759",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid rgba(20,20,20,0.92)",
                                animation: isJoining
                                    ? "none"
                                    : "iosRingPulse 1.5s ease-in-out infinite",
                            }}
                        >
                            <Box
                                style={{
                                    display: "flex",
                                    animation: isJoining
                                        ? "none"
                                        : "iosPhoneWobble 1.2s ease-in-out infinite",
                                }}
                            >
                                <IconPhone size={8} color="#fff" />
                            </Box>
                        </Box>
                    </Box>

                    <Stack gap={2} style={{ minWidth: 0 }}>
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
                            {isJoining ? "Connecting…" : "Incoming video call"}
                        </Text>
                    </Stack>
                </Group>

                {/* Right: action buttons */}
                {isJoining ? (
                    <Box
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "rgba(52,199,89,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Loader size={20} color="#34C759" />
                    </Box>
                ) : (
                    <Group gap={6} wrap="nowrap">
                        {/* Decline — red with glow */}
                        <ActionIcon
                            size={36}
                            radius={36}
                            loading={reject.isPending}
                            onClick={handleReject}
                            aria-label="Decline call"
                            style={{
                                background: "#FF3B30",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                animation: "iosDeclineGlow 2s ease-in-out infinite",
                                transition: "transform 0.15s ease",
                            }}
                            onMouseDown={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.9)";
                            }}
                            onMouseUp={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                            }}
                        >
                            <IconPhoneOff size={18} />
                        </ActionIcon>

                        {/* Accept — green with glow */}
                        <ActionIcon
                            size={36}
                            radius={36}
                            onClick={handleAccept}
                            aria-label="Accept call"
                            style={{
                                background: "#34C759",
                                color: "#fff",
                                border: "none",
                                borderRadius: "50%",
                                animation: "iosAcceptGlow 1.5s ease-in-out infinite",
                                transition: "transform 0.15s ease",
                            }}
                            onMouseDown={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.9)";
                            }}
                            onMouseUp={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
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
    const stylesInjectedRef = useRef(false);

    // Only show pending calls (not yet accepted/joining) in the toast stack;
    // limit to 3 visible toasts to avoid screen overflow.
    const pending = queue
        .filter((c) => c.status === "pending")
        .slice(0, 3);

    // Play ringtone when there are pending calls
    useCallRingtone(pending.length);

    // Inject keyframes once
    useEffect(() => {
        if (stylesInjectedRef.current) return;
        stylesInjectedRef.current = true;
        const style = document.createElement("style");
        style.textContent = IOS_KEYFRAMES;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, []);

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
