"use client";
import {
    Box,
    Card,
    Container,
    Divider,
    Group,
    Loader,
    ScrollArea,
    SegmentedControl,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconMessageSearch, IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import {
    useInfiniteSessionsQuery,
    useDeleteSessionMutation,
    type SessionSummary,
} from "@/app/(portal)/patient/_query";
import { getGroup, GROUP_ORDER } from "./_components/grouping";
import { SessionRow } from "./_components/session-row";
import { colors } from "@/ui/tokens";

// ── Agent type display helpers ────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
    generalMedicine: "General",
    triageNurse: "Triage",
    cardiology: "Cardiology",
    mentalHealth: "Mental Health",
    dermatology: "Dermatology",
    pediatrics: "Pediatrics",
    womensHealth: "Women's Health",
    orthopedics: "Orthopedics",
    gastroenterology: "Gastro",
    endocrinology: "Endocrinology",
    urology: "Urology",
    neurology: "Neurology",
    immunology: "Immunology",
    ent: "ENT",
    ophthalmology: "Ophthalmology",
    nephrology: "Nephrology",
    dentistry: "Dentistry",
    radiology: "Radiology",
    nutrition: "Nutrition",
    prescription: "Prescription",
    labReport: "Lab Report",
    patient: "Patient",
};

export function agentLabel(agentType?: string): string {
    if (!agentType) return "General";
    return AGENT_LABELS[agentType] ?? agentType;
}

const FILTER_OPTIONS = [
    { label: "All", value: "all" },
    { label: "General", value: "generalMedicine" },
    { label: "Cardiology", value: "cardiology" },
    { label: "Nutrition", value: "nutrition" },
    { label: "Prescription", value: "prescription" },
    { label: "Lab Report", value: "labReport" },
];

// ── Content (client) ──────────────────────────────────────────────────────────

export function HistoryContent() {
    const {
        data,
        isLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useInfiniteSessionsQuery();
    const deleteSession = useDeleteSessionMutation();
    const [query, setQuery] = useState("");
    const [debouncedQuery] = useDebouncedValue(query, 250);
    const [agentFilter, setAgentFilter] = useState("all");

    // Flatten all pages into a single array
    const allSessions = data?.pages.flatMap((p) => p.sessions) ?? [];
    const totalCount = data?.pages[0]?.totalCount;

    // Client-side search + agent filter
    const filtered = allSessions.filter((s) => {
        const q = debouncedQuery.trim().toLowerCase();
        if (q && !s.title.toLowerCase().includes(q)) return false;
        if (agentFilter !== "all") {
            if ((s.lastAgentType ?? "generalMedicine") !== agentFilter) return false;
        }
        return true;
    });

    // Group by date
    const grouped = new Map<string, SessionSummary[]>();
    for (const group of GROUP_ORDER) grouped.set(group, []);
    for (const s of filtered) {
        const g = getGroup(s.updatedAt);
        grouped.get(g)?.push(s);
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
            onConfirm: () => {
                deleteSession.mutate(id, {
                    onError: () =>
                        notifications.show({
                            title: "Delete failed",
                            message: "Could not delete session. Please try again.",
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    return (
        <Container pt="md">
            <Stack>
                {/* Header */}
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconMessageSearch size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>Search History</Title>
                            <Text size="xs" c="dimmed">
                                Browse and continue past assessments
                                {totalCount !== undefined && ` · ${totalCount} total`}
                            </Text>
                        </Box>
                    </Group>
                </Group>

                {/* Search + Filter */}
                <Stack gap="sm">
                    <TextInput
                        placeholder="Search sessions by title…"
                        leftSection={<IconSearch size={15} />}
                        value={query}
                        onChange={(e) => setQuery(e.currentTarget.value)}
                        radius="md"
                        size="sm"
                    />
                    <ScrollArea type="never">
                        <SegmentedControl
                            value={agentFilter}
                            onChange={setAgentFilter}
                            data={FILTER_OPTIONS}
                            size="xs"
                            radius="md"
                        />
                    </ScrollArea>
                </Stack>

                {/* Content */}
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
                                        {debouncedQuery || agentFilter !== "all"
                                            ? "No sessions match your filters"
                                            : "No sessions yet"}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {debouncedQuery || agentFilter !== "all"
                                            ? "Try a different search term or filter"
                                            : "Start a new assessment to see it here"}
                                    </Text>
                                </Box>
                            )}

                            {/* Results grouped by date */}
                            {!isLoading && filtered.length > 0 && (
                                <Stack gap="lg">
                                    {(() => {
                                        const sections: React.ReactNode[] = [];
                                        for (const [group, items] of grouped) {
                                            if (items.length === 0) continue;
                                            sections.push(
                                                <Box key={group}>
                                                    <Group gap="xs" mb="sm">
                                                        <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                                            {group}
                                                        </Text>
                                                        <Divider style={{ flex: 1 }} />
                                                    </Group>
                                                    <Stack gap="sm">
                                                        {items.map((s) => (
                                                            <SessionRow
                                                                key={s.id}
                                                                session={s}
                                                                isPendingDelete={deleteSession.isPending && deleteSession.variables === s.id}
                                                                onDelete={() => confirmDelete(s.id)}
                                                            />
                                                        ))}
                                                    </Stack>
                                                </Box>,
                                            );
                                        }
                                        return sections;
                                    })()}
                                </Stack>
                            )}

                            {/* Lazy-load sentinel */}
                            <LazyLoadSentinel
                                hasNextPage={!!hasNextPage}
                                isFetchingNextPage={isFetchingNextPage}
                                fetchNextPage={fetchNextPage}
                            />
                        </Box>
                    </ScrollArea>
                </Box>
            </Stack>
        </Container>
    );
}

// ── Lazy-load sentinel ────────────────────────────────────────────────────────

function LazyLoadSentinel({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
}: Readonly<{
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
}>) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !hasNextPage) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (!hasNextPage) return null;

    return (
        <Group justify="center" mt="lg" ref={ref}>
            {isFetchingNextPage && <Loader size="sm" />}
        </Group>
    );
}
