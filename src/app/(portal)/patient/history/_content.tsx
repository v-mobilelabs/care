"use client";
import {
    Box,
    Card,
    Container,
    Divider,
    Group,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconMessageSearch, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useSessionsQuery, useDeleteSessionMutation, type SessionSummary } from "@/app/(portal)/patient/_query";
import { spacing } from "@/ui/tokens";
import { getGroup, GROUP_ORDER } from "./_components/grouping";
import { SessionRow } from "./_components/session-row";


// ── Content (client) ──────────────────────────────────────────────────────────

export function HistoryContent() {
    const { data: sessions = [], isLoading } = useSessionsQuery();
    const deleteSession = useDeleteSessionMutation();
    const [query, setQuery] = useState("");


    const filtered = useMemo<SessionSummary[]>(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sessions;
        return sessions.filter((s) => s.title.toLowerCase().includes(q));
    }, [sessions, query]);

    const grouped = useMemo(() => {
        const map = new Map<string, SessionSummary[]>();
        for (const group of GROUP_ORDER) map.set(group, []);
        for (const s of filtered) {
            const g = getGroup(s.updatedAt);
            map.get(g)!.push(s);
        }
        return map;
    }, [filtered]);

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
        <Container pt="md">
            <Card radius="xl" withBorder>
                <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="md" withBorder>
                    <Group justify="space-between" align="center">
                        <Group gap="sm">
                            <ThemeIcon size={36} radius="md" color="primary" variant="light">
                                <IconMessageSearch size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>Search History</Title>
                                <Text size="xs" c="dimmed">Browse and continue past assessments</Text>
                            </Box>
                        </Group>
                    </Group>
                </Card.Section>
                <Card.Section px="md" py="sm" withBorder>
                    <TextInput
                        placeholder="Search sessions by title…"
                        leftSection={<IconSearch size={15} />}
                        value={query}
                        onChange={(e) => setQuery(e.currentTarget.value)}
                        radius="md"
                        size="sm"
                    />
                </Card.Section>
                <Card.Section p="md">
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box>

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
                                    <Stack gap={"lg"}>
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
                                                        <Stack gap="md">
                                                            {items.map((s) => (
                                                                <SessionRow
                                                                    key={s.id}
                                                                    session={s}
                                                                    isPendingDelete={deleteSession.isPending && deleteSession.variables === s.id}
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
                </Card.Section>
            </Card>
        </Container>
    );
}
