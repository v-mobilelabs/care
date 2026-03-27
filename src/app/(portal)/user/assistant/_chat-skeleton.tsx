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

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT_BG = "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-9))";

const FIXED_BAR_STYLE = {
    position: "fixed" as const,
    bottom: 0,
    left: "var(--app-shell-navbar-offset, 0px)",
    width: "calc(100% - var(--app-shell-navbar-offset, 0px) - var(--app-shell-aside-offset, 0px))",
    zIndex: 100,
    backgroundColor: INPUT_BG,
};

const GRADIENT_STYLE = {
    position: "absolute" as const,
    top: -40,
    left: 0,
    right: 0,
    height: 40,
    pointerEvents: "none" as const,
    background: `linear-gradient(to bottom, transparent, ${INPUT_BG})`,
};

// ── Input card skeleton ────────────────────────────────────────────────────────

function InputCardSkeleton() {
    return (
        <Box maw={760} mx="auto" w="100%" px="lg" pt="xs" pb="md">
            <Card radius="xl" shadow="xl" style={{ background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))" }}>
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
    );
}

// ── Input bar skeleton (fixed at bottom) ──────────────────────────────────────

function InputBarSkeleton() {
    return (
        <Box style={FIXED_BAR_STYLE}>
            <Box style={GRADIENT_STYLE} />
            <InputCardSkeleton />
        </Box>
    );
}

// ── Full chat skeleton ────────────────────────────────────────────────────────

const CONTAINER_STYLE = { display: "flex", flexDirection: "column" as const, height: "100%", overflow: "hidden" };

export function ChatSkeleton() {
    return (
        <Box style={CONTAINER_STYLE}>
            <Box style={{ flex: 1, overflowY: "auto" as const }}>
                <Stack gap="lg" maw={760} mx="auto" px="lg" pt="lg" pb={160}>
                    <MessageSkeleton align="right" />
                    <MessageSkeleton align="left" />
                    <MessageSkeleton align="right" />
                    <MessageSkeleton align="left" />
                </Stack>
            </Box>
            <InputBarSkeleton />
        </Box>
    );
}
