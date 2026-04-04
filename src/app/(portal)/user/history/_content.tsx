"use client";
import { MotionCard } from "@/ui/components/motion-card";
import {
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Group,
    Loader,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { ListToolbar } from "@/ui/components/list-toolbar";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconMessageSearch } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import {
    useInfiniteSessionsQuery,
    useDeleteSessionMutation,
    type SessionSummary,
} from "@/app/(portal)/user/_query";
import { getGroup, GROUP_ORDER } from "./_components/grouping";
import { SessionRow } from "./_components/session-row";
import { colors } from "@/ui/tokens";
import Link from "@/ui/link";

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

function HistoryLegend() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder shadow="xs" radius="lg" p="lg" style={{ borderColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-gray-8))" }}>
            <Stack gap="md">
                <Stack gap="xs">
                    <Text fw={600} size="sm">
                        How to use history
                    </Text>
                    <Text size="sm" c="dimmed">
                        Your history keeps each consultation in one place so you can resume context quickly instead of
                        repeating symptoms in a new chat every time.
                    </Text>
                </Stack>

                <Group gap="xs" wrap="wrap">
                    <Badge size="sm" variant="light" color="primary" radius="sm">
                        Agent badge = specialist used
                    </Badge>
                    <Badge size="sm" variant="light" color="gray" radius="sm">
                        Token badge = conversation size
                    </Badge>
                    <Badge size="sm" variant="light" color="secondary" radius="sm">
                        Msg badge = number of messages
                    </Badge>
                </Group>

                <Text size="xs" c="dimmed">
                    Open a session when you want continuity for follow-up questions, referral decisions, or medication/lab
                    clarifications.
                </Text>
            </Stack>
        </MotionCard>
    );
}

export interface HistoryInitialFilters {
    q?: string;
    agent?: string;
    sortDir?: "asc" | "desc";
}

// ── Content (client) ──────────────────────────────────────────────────────────

export function HistoryContent({
    initialFilters: _initialFilters,
}: Readonly<{ initialFilters?: HistoryInitialFilters }>) {
    const { search, filter: agentFilter, sortAsc, setFilters } = useUrlFilters<string>();
    const sortDir = sortAsc ? "asc" : "desc";

    const {
        data,
        isLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useInfiniteSessionsQuery({
        agent: agentFilter === "all" ? undefined : agentFilter,
        q: search.trim() || undefined,
        sortDir,
    });
    const deleteSession = useDeleteSessionMutation();

    // Flatten all pages into a single array
    const allSessions = data?.pages.flatMap((p) => p.sessions) ?? [];
    const totalCount = data?.pages[0]?.totalCount;

    // Server already applies search/filter/sort.
    const filtered = allSessions;

    // Group by date
    const grouped = new Map<string, SessionSummary[]>();
    for (const group of GROUP_ORDER) grouped.set(group, []);
    for (const s of filtered) {
        const g = getGroup(s.updatedAt);
        grouped.get(g)?.push(s);
    }

    function confirmDelete(id: string) {
        modals.openConfirmModal({
            title: "Delete session?",
            children: (
                <Text size="sm">
                    This will permanently remove this session from your history. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteSession.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Deleted",
                            message: "Session has been removed.",
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
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
        <Container pt="lg" pb="lg">
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
                                Revisit past conversations, continue care plans, and reuse context
                                {totalCount !== undefined && ` · ${totalCount} total`}
                            </Text>
                        </Box>
                    </Group>
                </Group>

                <HistoryLegend />

                <ListToolbar<string>
                    searchPlaceholder="Search sessions by title…"
                    search={search}
                    onSearchChange={(v) => setFilters({ q: v, p: 1 })}
                    filter={agentFilter || "all"}
                    onFilterChange={(v) => setFilters({ f: v, p: 1 })}
                    filterData={FILTER_OPTIONS}
                    sortAsc={sortAsc}
                    onSortAscChange={(asc) => setFilters({ s: asc ? "asc" : "desc", p: 1 })}
                />

                {/* Content */}
                <Box style={{ flex: 1, overflow: "hidden" }} mt="md">
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
                                    {(() => {
                                        const hasFilters = search.length > 0 || agentFilter !== "all";

                                        if (hasFilters) {
                                            return (
                                                <>
                                                    <Text fw={500} mb={4}>
                                                        No sessions match your filters
                                                    </Text>
                                                    <Text size="sm" c="dimmed">
                                                        Try a different search term or specialist filter.
                                                    </Text>
                                                </>
                                            );
                                        }

                                        return (
                                            <>
                                                <Text fw={500} mb={4}>
                                                    No sessions yet
                                                </Text>
                                                <Text size="sm" c="dimmed" maw={420} mx="auto">
                                                    Your chat history will appear here after you start a conversation.
                                                    Keeping sessions helps CareAI carry forward important context.
                                                </Text>
                                                <Button
                                                    component={Link}
                                                    href="/user/assistant"
                                                    variant="light"
                                                    color="primary"
                                                    mt="md"
                                                >
                                                    Start a new chat
                                                </Button>
                                            </>
                                        );
                                    })()}
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
                                                    <Group gap="xs" mb="md">
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
