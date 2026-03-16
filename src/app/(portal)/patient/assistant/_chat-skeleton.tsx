"use client";
import { Box, Card, Group, Skeleton, Stack } from "@mantine/core";

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
            style={{
                flexShrink: 0,
                backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-9))",
            }}
        >
            <Box maw={760} mx="auto" w="100%" px="lg" pt="xs" pb="md">
                <Card
                    radius="xl"
                    shadow="xl"
                    style={{
                        background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                    }}
                >
                    <Card.Section px="sm" py="sm">
                        <Skeleton height={20} width="60%" mt="sm" ml="md" />
                    </Card.Section>
                    <Group justify="space-between" px="sm" pb="sm">
                        <Group gap={4}>
                            <Skeleton circle h={32} w={32} />
                            <Skeleton circle h={32} w={32} />
                        </Group>
                        <Skeleton circle h={32} w={32} />
                    </Group>
                </Card>
                <Skeleton height={8} width={280} mx="auto" mt={8} />
            </Box>
        </Box>
    );
}

// ── Full chat skeleton ────────────────────────────────────────────────────────

export function ChatSkeleton() {
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
                <Stack gap="lg" maw={760} mx="auto" px="lg" pt="lg" pb={80}>
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
