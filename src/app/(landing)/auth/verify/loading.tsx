import { Box, Center, Loader, Text } from "@mantine/core";

// ── Verify page loading skeleton ──────────────────────────────────────────────

export default function VerifyLoading() {
    return (
        <Box
            style={{
                minHeight: "100dvh",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
            }}
        >
            <Center style={{ minHeight: "100dvh", flexDirection: "column", gap: 16 }}>
                <Loader size="md" color="primary" />
                <Text size="sm" c="dimmed">Verifying your sign-in link…</Text>
            </Center>
        </Box>
    );
}
