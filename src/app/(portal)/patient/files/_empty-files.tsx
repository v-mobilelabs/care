"use client";
import {
    Box,
    Button,
    Center,
    Loader,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import Link, { useLinkStatus } from "@/ui/link";

function StartChatLabel() {
    const { pending } = useLinkStatus();
    if (pending) return <Loader size={14} />;
    return <>Start a new chat</>;
}

export function EmptyFiles() {
    return (
        <Center style={{ flex: 1, flexDirection: "column", gap: 16 }} py="xl">
            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
                <IconFolder size={32} />
            </ThemeIcon>
            <Stack gap={4} align="center">
                <Title order={4} c="dimmed">No files yet</Title>
                <Text size="sm" c="dimmed" ta="center" maw={320}>
                    Files you upload during a chat session will appear here.
                </Text>
            </Stack>
            <Button
                variant="light"
                color="primary"
                component={Link}
                href="/patient/assistant"
            >
                <StartChatLabel />
            </Button>
        </Center>
    );
}
