"use client";
import {
    ActionIcon,
    Avatar,
    Box,
    Center,
    Group,
    Loader,
    ScrollArea,
    Stack,
    Text,
} from "@mantine/core";
import { IconMessageCircle, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useInbox } from "@/lib/messaging/use-inbox";
import { useAuth } from "@/ui/providers/auth-provider";
import { getInitials } from "@/lib/get-initials";
import type { DmInboxEntry } from "@/lib/messaging/types";

// ── Public component ──────────────────────────────────────────────────────────

interface ConversationListProps {
    readonly onSelect: (conversationId: string) => void;
    readonly onClose: () => void;
}

export function ConversationList({
    onSelect,
    onClose,
}: ConversationListProps) {
    const { user } = useAuth();
    const { entries, loading } = useInbox(user?.uid ?? null);

    return (
        <Stack gap={0} style={{ height: "100%" }}>
            {/* Header */}
            {/* <Group
                px="md"
                py="sm"
                justify="space-between"
                style={{
                    borderBottom:
                        "1px solid var(--mantine-color-default-border)",
                }}
            >
                <Text fw={600} size="lg">
                    Messages
                </Text>
                <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Close">
                    <IconX size={18} />
                </ActionIcon>
            </Group> */}

            {/* Body */}
            <ScrollArea style={{ flex: 1 }}>
                {(() => {
                    if (loading) {
                        return (
                            <Center py="xl">
                                <Loader size="sm" />
                            </Center>
                        );
                    }

                    if (entries.length === 0) {
                        return (
                            <Center py="xl">
                                <Stack align="center" gap="xs">
                                    <IconMessageCircle
                                        size={40}
                                        stroke={1.2}
                                        color="var(--mantine-color-dimmed)"
                                    />
                                    <Text c="dimmed" size="sm">
                                        No conversations yet
                                    </Text>
                                </Stack>
                            </Center>
                        );
                    }

                    return entries.map((entry) => (
                        <ConversationItem
                            key={entry.conversationId}
                            entry={entry}
                            onSelect={() => onSelect(entry.conversationId)}
                        />
                    ));
                })()}
            </ScrollArea>
        </Stack>
    );
}

// ── Single conversation row ───────────────────────────────────────────────────

function ConversationItem({
    entry,
    onSelect,
}: Readonly<{ entry: DmInboxEntry; onSelect: () => void }>) {
    const [hovered, setHovered] = useState(false);
    const initials = getInitials(entry.otherName, null);
    const time = entry.lastMessageAt ? formatTime(entry.lastMessageAt) : "";

    return (
        <Box
            px="md"
            py="sm"
            onClick={onSelect}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                cursor: "pointer",
                borderBottom: "1px solid var(--mantine-color-default-border)",
                backgroundColor: hovered
                    ? "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
                    : entry.unread > 0
                        ? "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))"
                        : undefined,
                transition: "background-color 150ms ease",
            }}
        >
            <Group wrap="nowrap">
                <Avatar size="md" radius="xl" color="primary">
                    {initials}
                </Avatar>

                <Box style={{ flex: 1, overflow: "hidden" }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Text size="sm" fw={entry.unread > 0 ? 700 : 500} truncate>
                            {entry.otherName}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                            {time}
                        </Text>
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                        {entry.lastMessage || "No messages yet"}
                    </Text>
                </Box>

                {entry.unread > 0 && (
                    <Box
                        style={{
                            minWidth: 20,
                            height: 20,
                            borderRadius: 10,
                            background: "var(--mantine-color-primary-6)",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text size="xs" c="white" fw={700} lh={1}>
                            {entry.unread}
                        </Text>
                    </Box>
                )}
            </Group>
        </Box>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    const date = new Date(ts);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
