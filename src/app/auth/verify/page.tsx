// Verify page — landing target for magic link emails.
// Uses Suspense because the handler reads window.location (client-only).
import { Suspense } from "react";
import { Box, Center, Loader, Text } from "@mantine/core";
import { VerifyHandler } from "@/app/auth/verify/_handler";

export const metadata = { title: "Signing In — CareAI" };

function VerifyFallback() {
    return (
        <Center style={{ minHeight: "100dvh", flexDirection: "column", gap: 16 }}>
            <Loader size="md" color="primary" />
            <Text size="sm" c="dimmed">Verifying your sign-in link…</Text>
        </Center>
    );
}

export default function VerifyPage() {
    return (
        <Box style={{ minHeight: "100dvh", background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" }}>
            <Suspense fallback={<VerifyFallback />}>
                <VerifyHandler />
            </Suspense>
        </Box>
    );
}
