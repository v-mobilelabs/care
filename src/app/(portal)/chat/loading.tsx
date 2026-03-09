import { Box, Group, Skeleton, Stack } from "@mantine/core";

// ── Message skeleton ──────────────────────────────────────────────────────────

function MessageSkeleton({ align }: Readonly<{ align: "left" | "right" }>) {
    const isRight = align === "right";
    return (
        <Stack gap={6} align={isRight ? "flex-end" : "flex-start"}>
            <Group gap={8} style={{ flexDirection: isRight ? "row-reverse" : "row" }}>
                <Skeleton circle h={26} w={26} />
                <Skeleton height={8} width={32} />
            </Group>
            <Box maw={isRight ? "55%" : "70%"} w="100%">
                <Skeleton height={14} mb={6} />
                <Skeleton height={14} mb={6} width="80%" />
                {!isRight && <Skeleton height={14} width="60%" />}
            </Box>
        </Stack>
    );
}

// ── Input bar skeleton ────────────────────────────────────────────────────────

function InputBarSkeleton() {
    return (
        <Box
            px="lg"
            py="md"
            style={{
                flexShrink: 0,
                borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-8))",
            }}
        >
            <Box maw={760} mx="auto">
                <Skeleton height={88} radius="xl" />
                <Skeleton height={8} width={320} mt={10} mx="auto" />
            </Box>
        </Box>
    );
}

// ── Starter cards skeleton ────────────────────────────────────────────────────

function StarterCardsSkeleton() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                flex: 1,
                paddingBottom: 8,
                paddingLeft: 24,
                paddingRight: 24,
                gap: 24,
            }}
        >
            <Stack align="center" gap={8}>
                <Skeleton circle h={52} w={52} />
                <Skeleton height={16} width={220} />
                <Skeleton height={10} width={300} />
            </Stack>
            <Box
                maw={760}
                w="100%"
                style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}
            >
                {["a", "b", "c", "d", "e", "f"].map((k) => (
                    <Box
                        key={k}
                        style={{
                            padding: 16,
                            border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                            borderRadius: 12,
                        }}
                    >
                        <Skeleton circle h={34} w={34} mb={10} />
                        <Skeleton height={12} width="70%" mb={6} />
                        <Skeleton height={9} width="90%" />
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
// Renders as a child of AppShell.Main (provided by chat/layout.tsx).
// Must NOT nest another AppShell — just fill the available flex column space.

export default function ChatLoading() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* Scrollable content */}
            <Box style={{ flex: 1, overflowY: "auto" }}>
                <Stack gap="xl" maw={760} mx="auto" px="lg" py="lg">
                    <StarterCardsSkeleton />
                    <MessageSkeleton align="right" />
                    <MessageSkeleton align="left" />
                    <MessageSkeleton align="right" />
                    <MessageSkeleton align="left" />
                </Stack>
            </Box>

            {/* Input */}
            <InputBarSkeleton />
        </Box>
    );
}
