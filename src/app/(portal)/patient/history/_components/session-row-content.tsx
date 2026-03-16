import { Group, Badge, Box, ThemeIcon, Text, Loader, ActionIcon } from "@mantine/core";
import { IconMessage, IconCalendar, IconTrash } from "@tabler/icons-react";
import { useLinkStatus } from "next/link";
import type { SessionSummary } from "@/app/(portal)/patient/_query";
import React from "react";

export function SessionRowContent({ session, isPendingDelete, onDelete }: Readonly<{
    session: SessionSummary;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const { pending } = useLinkStatus();
    const formattedDate = new Date(session.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const formattedTime = new Date(session.updatedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });

    return (
        <Group justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <ThemeIcon size={32} radius="md" color="primary" variant="light" style={{ flexShrink: 0 }}>
                    {pending ? <Loader size={14} /> : <IconMessage size={16} />}
                </ThemeIcon>
                <Box style={{ minWidth: 0 }}>
                    <Text
                        size="sm"
                        fw={500}
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {session.title}
                    </Text>
                    <Group gap={6} mt={2}>
                        <IconCalendar size={11} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
                        <Text size="xs" c="dimmed" suppressHydrationWarning>{formattedDate} · {formattedTime}</Text>
                    </Group>
                </Box>
            </Group>
            <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
                <Badge size="xs" variant="light" color="secondary" radius="sm">
                    {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
                </Badge>
                <ActionIcon
                    size={28}
                    variant="subtle"
                    color="danger"
                    onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    title="Delete session"
                    disabled={isPendingDelete}
                    loading={isPendingDelete}
                >
                    <IconTrash size={13} />
                </ActionIcon>
            </Group>
        </Group>
    );
}
