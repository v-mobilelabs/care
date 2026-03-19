"use client";
import {
    ActionIcon,
    Avatar,
    Box,
    Center,
    Group,
    Indicator,
    Loader,
    ScrollArea,
    Stack,
    Text,
} from "@mantine/core";
import { IconMail, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useInbox } from "@/lib/messaging/use-inbox";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import type { DmInboxEntry } from "@/lib/messaging/types";

// ── Public component ──────────────────────────────────────────────────────────

interface ConversationListProps {
    readonly onSelect: (conversationId: string) => void;
    readonly onClose: () => void;
}

export function ConversationList({
    onSelect,
    onClose,
}: Readonly<ConversationListProps>) {
    const { user } = useAuth();
    const { entries, loading } = useInbox(user?.uid ?? null);

    return (
        <Stack gap={0} style={{ height: "100%" }}>
            {/* Header */}
            <Group
                px="md"
                py="sm"
                justify="space-between"
                style={{
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                    flexShrink: 0,
                }}
                bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))"
            >
                <Text fw={600} size="sm">Messages</Text>
                <ActionIcon size="md" variant="subtle" color="gray" onClick={onClose} aria-label="Close messages">
                    <IconX size={18} />
                </ActionIcon>
            </Group>

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
                                    <IconMail
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
    const { online } = usePresenceStatus(entry.otherUid);
    const time = entry.lastMessageAt ? formatTime(entry.lastMessageAt) : "";

    function bgColor() {
        if (hovered) return "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))";
        if (entry.unread > 0) return "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))";
        return undefined;
    }

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
                backgroundColor: bgColor(),
                transition: "background-color 150ms ease",
            }}
        >
            <Group wrap="nowrap" gap="sm">
                <Indicator
                    color={online ? "teal" : "gray"}
                    size={10}
                    offset={4}
                    position="bottom-end"
                    withBorder
                >
                    <Avatar size="sm" radius="xl" color="primary" name={entry.otherName} />
                </Indicator>

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
