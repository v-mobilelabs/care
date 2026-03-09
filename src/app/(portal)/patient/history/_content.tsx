"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    Paper,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
    IconCalendar,
    IconMessage,
    IconMessageSearch,
    IconSearch,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { useSessionsQuery, useDeleteSessionMutation, type SessionSummary } from "@/app/(portal)/patient/_query";
import { spacing } from "@/ui/tokens";

// ── Date-grouping helpers ─────────────────────────────────────────────────────

type Group = "Today" | "Yesterday" | "This Week" | "This Month" | "Older";

function getGroup(dateStr: string): Group {
    const now = new Date();
    const d = new Date(dateStr);

    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate();

    if (sameDay) return "Today";
    if (isYesterday) return "Yesterday";
    if (diffDays < 7) return "This Week";
    if (diffDays < 30) return "This Month";
    return "Older";
}

const GROUP_ORDER: Group[] = ["Today", "Yesterday", "This Week", "This Month", "Older"];

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session, isPendingDelete, onOpen, onDelete }: Readonly<{
    session: SessionSummary;
    isPendingDelete: boolean;
    onOpen: () => void;
    onDelete: () => void;
}>) {
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
        <Paper
            withBorder
            radius="md"
            px="md"
            py="sm"
            onClick={onOpen}
            style={{
                cursor: "pointer",
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
            }}
        >
            <Group justify="space-between" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <ThemeIcon size={32} radius="md" color="primary" variant="light" style={{ flexShrink: 0 }}>
                        <IconMessage size={16} />
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
                        color="gray"
                        onClick={(e: React.MouseEvent) => {
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
        </Paper>
    );
}

// ── Content (client) ──────────────────────────────────────────────────────────

export function HistoryContent() {
    const { data: sessions = [], isLoading } = useSessionsQuery();
    const deleteSession = useDeleteSessionMutation();
    const [query, setQuery] = useState("");
    const router = useRouter();
    const [, startNavTransition] = useTransition();

    const filtered = useMemo<SessionSummary[]>(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sessions;
        return sessions.filter((s) => s.title.toLowerCase().includes(q));
    }, [sessions, query]);

    const grouped = useMemo<Map<Group, SessionSummary[]>>(() => {
        const map = new Map<Group, SessionSummary[]>();
        for (const group of GROUP_ORDER) map.set(group, []);
        for (const s of filtered) {
            const g = getGroup(s.updatedAt);
            map.get(g)!.push(s);
        }
        return map;
    }, [filtered]);

    function openSession(id: string) {
        startNavTransition(() => { router.push(`/patient/assistant?id=${id}`); });
    }

    function confirmDelete(id: string) {
        modals.openConfirmModal({
            title: "Delete assessment?",
            children: (
                <Text size="sm">
                    This will permanently remove this session from your history. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => { deleteSession.mutate(id); },
        });
    }

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconMessageSearch size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>Search History</Title>
                        <Text size="xs" c="dimmed">Browse and continue past assessments</Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" style={{ maxWidth: 720, margin: "0 auto" }}>
                        {/* Search input */}
                        <TextInput
                            placeholder="Search sessions by title…"
                            leftSection={<IconSearch size={15} />}
                            value={query}
                            onChange={(e) => setQuery(e.currentTarget.value)}
                            mb={spacing.xl}
                            radius="md"
                            size="sm"
                        />

                        {/* Loading skeletons */}
                        {isLoading && (
                            <Stack gap="sm">
                                {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"].map((k) => (
                                    <Skeleton key={k} height={62} radius="md" />
                                ))}
                            </Stack>
                        )}

                        {/* Empty state */}
                        {!isLoading && filtered.length === 0 && (
                            <Box py={60} style={{ textAlign: "center" }}>
                                <ThemeIcon size={48} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                                    <IconMessageSearch size={24} />
                                </ThemeIcon>
                                <Text fw={500} mb={4}>
                                    {query ? "No sessions match your search" : "No sessions yet"}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {query
                                        ? "Try a different search term"
                                        : "Start a new assessment to see it here"}
                                </Text>
                            </Box>
                        )}

                        {/* Results grouped by date */}
                        {!isLoading && filtered.length > 0 && (
                            <Stack gap={spacing.lg}>
                                {(() => {
                                    const sections: React.ReactNode[] = [];
                                    for (const [group, items] of grouped) {
                                        if (items.length === 0) continue;
                                        sections.push(
                                            <Box key={group}>
                                                <Group gap="xs" mb="xs">
                                                    <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                                        {group}
                                                    </Text>
                                                    <Divider style={{ flex: 1 }} />
                                                </Group>
                                                <Stack gap="xs">
                                                    {items.map((s) => (
                                                        <SessionRow
                                                            key={s.id}
                                                            session={s}
                                                            isPendingDelete={deleteSession.isPending && deleteSession.variables === s.id}
                                                            onOpen={() => openSession(s.id)}
                                                            onDelete={() => confirmDelete(s.id)}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        );
                                    }
                                    return sections;
                                })()}
                            </Stack>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
