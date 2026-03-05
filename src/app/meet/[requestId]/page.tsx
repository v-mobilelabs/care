"use client";
/**
 * MeetPage — loads join credentials then renders the Chime video room.
 * The actual room is dynamically imported to prevent SSR issues with Web APIs.
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Center, Loader, Stack, Text } from "@mantine/core";
import type { AttendeeJoinInfo } from "@/data/meet";
import { useAuth } from "@/ui/providers/auth-provider";

const MeetingRoom = dynamic(
    () => import("./_room").then((m) => ({ default: m.MeetingRoom })),
    { ssr: false },
);

export default function MeetPage({
    params,
}: Readonly<{ params: Promise<{ requestId: string }> }>) {
    const { user, loading: authLoading, kind } = useAuth();
    const router = useRouter();
    const [requestId, setRequestId] = useState<string | null>(null);
    const [joinInfo, setJoinInfo] = useState<AttendeeJoinInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Resolve route params
    useEffect(() => {
        void params.then((p) => setRequestId(p.requestId));
    }, [params]);

    // Fetch join info once auth + requestId are ready
    useEffect(() => {
        if (authLoading || !user || !requestId) return;

        // Check if doctor has pre-stored join info (set when accepting the call)
        const stored = sessionStorage.getItem(`meet-join-${requestId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as AttendeeJoinInfo;
                sessionStorage.removeItem(`meet-join-${requestId}`);
                setJoinInfo(parsed);
                return;
            } catch {
                // fall through to API
            }
        }

        fetch(`/api/meet/${requestId}/join`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = (await res.json()) as { error?: { message?: string } };
                    throw new Error(body.error?.message ?? "Failed to load meeting");
                }
                return res.json() as Promise<AttendeeJoinInfo>;
            })
            .then((info) => setJoinInfo(info))
            .catch((err: Error) => {
                setError(err.message);
                const fallback = kind === "doctor" ? "/doctor/dashboard" : "/chat/connect";
                setTimeout(() => router.push(fallback), 3000);
            });
    }, [authLoading, user, requestId, router, kind]);

    if (error) {
        return (
            <Center h="100vh">
                <Stack align="center" gap="sm">
                    <Text c="red" fw={600}>
                        {error}
                    </Text>
                    <Text c="dimmed" size="sm">
                        Redirecting you back…
                    </Text>
                </Stack>
            </Center>
        );
    }

    if (!joinInfo) {
        return (
            <Center h="100vh">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed" size="sm">
                        Setting up your video call…
                    </Text>
                </Stack>
            </Center>
        );
    }

    return <MeetingRoom requestId={requestId!} joinInfo={joinInfo} />;
}
