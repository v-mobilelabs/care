"use client";
import { MotionCard } from "@/ui/components/motion-card";

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Checkbox,
    Container,
    Group,
    Loader,
    ScrollArea,
    Select,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconBrain,
    IconCheck,
    IconClock,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import {
    useDeleteManyMemoriesMutation,
    useDeleteMemoryMutation,
    useMemoriesInfiniteQuery,
    type MemoryCategory,
    type MemoryRecord,
    type MemorySortBy,
    type SortDirection,
} from "@/app/(portal)/user/_query";
import { formatDate } from "@/lib/format";
import { colors } from "@/ui/tokens";

const CATEGORY_FILTER_OPTIONS: Array<{ label: string; value: "all" | MemoryCategory }> = [
    { label: "All categories", value: "all" },
    { label: "Medical", value: "medical" },
    { label: "Preferences", value: "preference" },
    { label: "Lifestyle", value: "lifestyle" },
    { label: "Allergies", value: "allergy" },
    { label: "Summaries", value: "summary" },
];

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
    medical: "Medical",
    preference: "Preference",
    lifestyle: "Lifestyle",
    allergy: "Allergy",
    summary: "Summary",
};

const SORT_OPTIONS: Array<{ label: string; value: MemorySortBy }> = [
    { label: "Last accessed", value: "lastAccessedAt" },
    { label: "Created date", value: "createdAt" },
    { label: "Category", value: "category" },
];

function getDeleteFailureMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return "Could not remove memory. Please try again.";
}

function MemoryCard({
    memory,
    checked,
    onToggle,
    onDelete,
    isDeleting,
}: Readonly<{
    memory: MemoryRecord;
    checked: boolean;
    onToggle: () => void;
    onDelete: () => void;
    isDeleting: boolean;
}>) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
        }
    };

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md" style={{ opacity: isDeleting ? 0.5 : 1, transition: "opacity 150ms ease" }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                <Group
                    gap="sm"
                    wrap="nowrap"
                    align="flex-start"
                    style={{ minWidth: 0, flex: 1, cursor: "pointer" }}
                    onClick={onToggle}
                    onKeyDown={handleKeyDown}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select memory ${memory.content.slice(0, 30)}`}
                >
                    <Checkbox checked={checked} onChange={onToggle} aria-label="Select memory" mt={3} size="sm" />
                    <Box style={{ minWidth: 0, flex: 1 }}>
                        <Group gap={8} wrap="wrap" mb={6}>
                            <Badge size="xs" variant="light" color="indigo" radius="sm">
                                {CATEGORY_LABELS[memory.category]}
                            </Badge>
                            <Group gap={4} wrap="nowrap">
                                <IconClock size={12} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">
                                    Accessed {formatDate(memory.lastAccessedAt)}
                                </Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                                Created {formatDate(memory.createdAt)}
                            </Text>
                        </Group>
                        <Text size="sm" lh={1.6}>
                            {memory.content}
                        </Text>
                    </Box>
                </Group>

                <Tooltip label="Remove" withArrow>
                    <ActionIcon
                        size={30}
                        variant="subtle"
                        color="red"
                        onClick={onDelete}
                        disabled={isDeleting}
                        aria-label="Remove memory"
                    >
                        <IconTrash size={15} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </MotionCard>
    );
}

function MemoriesSkeletons() {
    return (
        <Stack gap="sm">
            {["mem-sk-a", "mem-sk-b", "mem-sk-c"].map((k) => (
                <Skeleton key={k} height={104} radius="lg" />
            ))}
        </Stack>
    );
}

function EmptyState({ hasFilters }: Readonly<{ hasFilters: boolean }>) {
    if (hasFilters) {
        return (
            <Box py={80} style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed" maw={360} mx="auto" lh={1.6}>
                    No memories match your current search and filters.
                </Text>
            </Box>
        );
    }

    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                <IconBrain size={30} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" maw={420} mx="auto" lh={1.6}>
                Your assistant memory list is empty. As you chat with CareAI, important facts are saved here for continuity.
            </Text>
        </Box>
    );
}

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
        if (!el || hasNextPage === false) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && isFetchingNextPage === false) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (hasNextPage === false) return null;

    return (
        <Group justify="center" mt="lg" ref={ref}>
            {isFetchingNextPage ? <Loader size="sm" /> : null}
        </Group>
    );
}

// eslint-disable-next-line max-lines-per-function
export function MemoriesContent() {
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const [categoryFilter, setCategoryFilter] = useState<"all" | MemoryCategory>("all");
    const [sortBy, setSortBy] = useState<MemorySortBy>("lastAccessedAt");
    const [sortDir, setSortDir] = useState<SortDirection>("desc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const category = categoryFilter === "all" ? undefined : categoryFilter;

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMemoriesInfiniteQuery({
        q: debouncedSearch || undefined,
        category,
        sortBy,
        sortDir,
    });

    const memories = useMemo(
        () => data?.pages.flatMap((page) => page.memories) ?? [],
        [data],
    );

    const deleteMemory = useDeleteMemoryMutation();
    const deleteMany = useDeleteManyMemoriesMutation();

    const totalCount = data?.pages[0]?.totalCount ?? 0;
    const hasFilters = debouncedSearch.length > 0 || category !== undefined;
    const hasMemories = memories.length > 0;
    const showEmpty = isLoading === false && hasMemories === false;
    const showList = isLoading === false && hasMemories;
    const allVisibleIds = memories.map((m) => m.id);
    const selectedVisibleIds = allVisibleIds.filter((id) => selectedIds.has(id));
    const selectedCount = selectedVisibleIds.length;
    const allSelected = allVisibleIds.length > 0 && selectedCount === allVisibleIds.length;
    const selectIndeterminate = selectedCount > 0 && selectedCount < allVisibleIds.length;

    const handleToggleSelect = (memoryId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(memoryId)) {
                next.delete(memoryId);
            } else {
                next.add(memoryId);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(allVisibleIds));
    };

    const handleDeleteOne = (memory: MemoryRecord) => {
        modals.openConfirmModal({
            title: "Remove memory?",
            children: (
                <Text size="sm">
                    This memory will be removed permanently. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMemory.mutate(memory.id, {
                    onSuccess: () => {
                        setSelectedIds((prev) => {
                            const next = new Set(prev);
                            next.delete(memory.id);
                            return next;
                        });
                        notifications.show({
                            title: "Memory removed",
                            message: "The selected memory has been removed.",
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        });
                    },
                    onError: (error) => {
                        notifications.show({
                            title: "Delete failed",
                            message: getDeleteFailureMessage(error),
                            color: colors.danger,
                        });
                    },
                });
            },
        });
    };

    const handleDeleteSelected = () => {
        const ids = selectedVisibleIds;
        if (ids.length === 0) return;

        modals.openConfirmModal({
            title: `Remove ${ids.length} memor${ids.length === 1 ? "y" : "ies"}?`,
            children: (
                <Text size="sm">
                    All selected memories will be deleted permanently. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete selected", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMany.mutate(ids, {
                    onSuccess: () => {
                        setSelectedIds(new Set());
                        notifications.show({
                            title: "Memories removed",
                            message: `${ids.length} ${ids.length === 1 ? "memory" : "memories"} removed successfully.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        });
                    },
                    onError: (error) => {
                        notifications.show({
                            title: "Bulk delete failed",
                            message: getDeleteFailureMessage(error),
                            color: colors.danger,
                        });
                    },
                });
            },
        });
    };

    const isBulkDeleting = deleteMany.isPending;

    return (
        <Container pt="md">
            <Stack>
                <Group justify="space-between" align="center" wrap="wrap">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconBrain size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>
                                My Memories
                            </Title>
                            <Text size="xs" c="dimmed">
                                View assistant memories, search quickly, and remove what you no longer want stored.
                            </Text>
                        </Box>
                    </Group>

                    {totalCount > 0 ? (
                        <Badge variant="light" color="gray" size="sm" radius="xl">
                            {totalCount} memor{totalCount === 1 ? "y" : "ies"}
                        </Badge>
                    ) : null}
                </Group>

                <Group gap="sm" wrap="wrap" align="flex-end">
                    <TextInput
                        placeholder="Search memory content…"
                        leftSection={<IconSearch size={16} />}
                        rightSection={
                            search.length > 0 ? (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                >
                                    <IconX size={14} />
                                </ActionIcon>
                            ) : undefined
                        }
                        size="sm"
                        value={search}
                        onChange={(event) => setSearch(event.currentTarget.value)}
                        style={{ flex: 1, minWidth: 220 }}
                    />

                    <Select
                        label="Category"
                        size="xs"
                        value={categoryFilter}
                        onChange={(value) => {
                            if (value === null) return;
                            setCategoryFilter(value as "all" | MemoryCategory);
                        }}
                        data={CATEGORY_FILTER_OPTIONS}
                        w={170}
                    />

                    <Select
                        label="Sort"
                        size="xs"
                        value={sortBy}
                        onChange={(value) => {
                            if (value === null) return;
                            setSortBy(value as MemorySortBy);
                        }}
                        data={SORT_OPTIONS}
                        w={170}
                    />

                    <Tooltip label={sortDir === "asc" ? "Ascending" : "Descending"} withArrow>
                        <ActionIcon
                            size={32}
                            variant="light"
                            color="gray"
                            onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                            aria-label="Toggle sort direction"
                        >
                            {sortDir === "asc" ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="sm">
                    <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                        <Checkbox
                            checked={allSelected}
                            indeterminate={selectIndeterminate}
                            onChange={handleToggleSelectAll}
                            label="Select all visible"
                            size="sm"
                        />
                        <Group gap="xs">
                            <Badge size="sm" variant="light" color="gray">
                                {selectedCount} selected
                            </Badge>
                            <Button
                                size="xs"
                                color="red"
                                leftSection={<IconTrash size={14} />}
                                disabled={selectedCount === 0 || isBulkDeleting}
                                loading={isBulkDeleting}
                                onClick={handleDeleteSelected}
                            >
                                Delete selected
                            </Button>
                        </Group>
                    </Group>
                </MotionCard>

                <Box style={{ flex: 1, overflow: "hidden" }}>
                    <ScrollArea style={{ height: "100%" }}>
                        <Box maw={1080} mx="auto">
                            {isLoading ? <MemoriesSkeletons /> : null}

                            {showEmpty ? <EmptyState hasFilters={hasFilters} /> : null}

                            {showList ? (
                                <Stack gap="sm">
                                    {memories.map((memory) => (
                                        <MemoryCard
                                            key={memory.id}
                                            memory={memory}
                                            checked={selectedIds.has(memory.id)}
                                            onToggle={() => handleToggleSelect(memory.id)}
                                            onDelete={() => handleDeleteOne(memory)}
                                            isDeleting={deleteMemory.isPending && deleteMemory.variables === memory.id}
                                        />
                                    ))}

                                    <LazyLoadSentinel
                                        hasNextPage={hasNextPage === true}
                                        isFetchingNextPage={isFetchingNextPage}
                                        fetchNextPage={fetchNextPage}
                                    />
                                </Stack>
                            ) : null}
                        </Box>
                    </ScrollArea>
                </Box>
            </Stack>
        </Container>
    );
}
