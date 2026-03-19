"use client";
import { Alert, Avatar, Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconCoins, IconHeartbeat, IconRefresh } from "@tabler/icons-react";

// ── Error parsing helper ──────────────────────────────────────────────────────

interface ParsedApiError {
    code: string | null;
    message: string;
}

function parseApiError(err: Error | null | undefined): ParsedApiError {
    if (!err) return { code: null, message: "Response didn't generate. Something went wrong." };
    try {
        const parsed = JSON.parse(err.message) as { error?: { code?: string; message?: string } };
        const code = parsed.error?.code ?? null;
        const message = parsed.error?.message ?? err.message;
        return { code, message };
    } catch {
        return { code: null, message: err.message };
    }
}

// ── RetryBlock ────────────────────────────────────────────────────────────────

export function RetryBlock({ error, onRetry }: Readonly<{ error?: Error | null; onRetry: () => void }>) {
    const { code, message } = parseApiError(error);

    if (code === "CREDITS_EXHAUSTED") {
        return (
            <Group align="flex-start" gap="xs" wrap="nowrap">
                <Avatar size={28} radius="xl" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                    <IconHeartbeat size={16} />
                </Avatar>
                <Alert
                    icon={<IconCoins size={16} />}
                    color="orange"
                    radius="md"
                    variant="light"
                    title="Daily credits used up"
                    style={{ flex: 1 }}
                >
                    <Text size="sm">{message}</Text>
                </Alert>
            </Group>
        );
    }

    return (
        <Group align="flex-start" gap="xs" wrap="nowrap">
            <Avatar size={28} radius="xl" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                <IconHeartbeat size={16} />
            </Avatar>
            <Stack gap={6}>
                <Group gap={6} align="center">
                    <IconAlertCircle size={14} style={{ color: "var(--mantine-color-red-5)", flexShrink: 0 }} />
                    <Text size="sm" c="dimmed">
                        {message}
                    </Text>
                </Group>
                <Button
                    variant="default"
                    size="xs"
                    radius="xl"
                    leftSection={<IconRefresh size={13} />}
                    onClick={onRetry}
                    style={{ alignSelf: "flex-start", fontWeight: 500 }}
                >
                    Regenerate response
                </Button>
            </Stack>
        </Group>
    );
}
