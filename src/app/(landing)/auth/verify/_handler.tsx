"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Center, Loader, Stack, Text, Button } from "@mantine/core";
import { completeMagicLink } from "@/lib/firebase/magic-link";
import { trackEvent } from "@/lib/analytics";
import type { UserKind } from "@/lib/auth/jwt";

/**
 * Single verify handler for all user types.
 * After creating the session, routes based on the `kind` the server auto-detected
 * from the user's Firestore profile — no kind param needed in the URL.
 */
export function VerifyHandler() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function verify() {
            try {
                const idToken = await completeMagicLink(globalThis.window.location.href);
                const res = await fetch("/api/auth/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken }),
                });
                if (!res.ok) throw new Error("Session creation failed");
                const { kind } = (await res.json()) as { kind: UserKind };

                await routeByKind(kind, router);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Sign-in failed");
            }
        }
        void verify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) {
        return (
            <Center style={{ minHeight: "100dvh" }}>
                <Stack align="center" gap="sm">
                    <Text c="red" fw={600}>Sign-in failed</Text>
                    <Text size="sm" c="dimmed">{error}</Text>
                    <Button variant="subtle" onClick={() => router.replace("/auth/login")}>Back to login</Button>
                </Stack>
            </Center>
        );
    }

    return (
        <Center style={{ minHeight: "100dvh", flexDirection: "column", gap: 16 }}>
            <Loader size="md" color="primary" />
            <Text size="sm" c="dimmed">Signing you in…</Text>
        </Center>
    );
}

async function routeByKind(
    kind: UserKind,
    router: ReturnType<typeof useRouter>,
): Promise<void> {
    if (kind === "doctor") {
        const profileRes = await fetch("/api/doctors/me");
        if (profileRes.ok) {
            router.replace("/doctor/dashboard");
        } else if (profileRes.status === 404) {
            router.replace("/doctor/signup");
        } else {
            throw new Error("Could not check profile status.");
        }
    } else {
        trackEvent({ name: "login", params: { method: "magic_link" } });
        router.replace("/patient/assistant");
    }
}

