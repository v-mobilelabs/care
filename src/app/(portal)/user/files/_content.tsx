"use client";
import { useEffect, useRef, useState } from "react";
import {
    Badge,
    Box,
    Container,
    Group,
    Loader,
    ScrollArea,
    SegmentedControl,
    SimpleGrid,
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
import {
    IconCheck,
    IconFolder,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconX,
} from "@tabler/icons-react";

import {
    useFilesQuery,
    useDeleteFileMutation,
    type FileRecord,
    type FileLabel,
} from "@/app/(portal)/user/_query";
import { FILE_LABELS, FILE_LABEL_DISPLAY } from "@/data/files/models/file.model";
import { colors } from "@/ui/tokens";
import { StorageBar } from "./_storage-bar";
import { FileCard } from "./_file-card";
import { EmptyFiles } from "./_empty-files";

export interface FilesInitialFilters {
    label?: FileLabel;
    q?: string;
    sortDir?: "asc" | "desc";
}

// ── Delete action hook ────────────────────────────────────────────────────────

function useFilesActions() {
    const deleteFile = useDeleteFileMutation();
    function handleDelete(file: FileRecord) {
        modals.openConfirmModal({
            title: "Delete file?",
            children: (
                <Text size="sm">
                    <strong>{file.name}</strong> will be permanently removed
                    from your storage. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteFile.mutate(
                    { fileId: file.id },
                    {
                        onSuccess: () =>
                            notifications.show({
                                message: `${file.name} deleted.`,
                                color: colors.success,
                                icon: <IconCheck size={16} />,
                            }),
                        onError: () =>
                            notifications.show({
                                title: "Delete failed",
                                message: `Could not delete ${file.name}. Please try again.`,
                                color: colors.danger,
                            }),
                    },
                );
            },
        });
    }
    return { handleDelete, isDeletePending: deleteFile.isPending, pendingDeleteFileId: deleteFile.variables?.fileId };
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilesFilterBarProps {
    labelFilter: FileLabel | undefined;
    setLabelFilter: (v: FileLabel | undefined) => void;
    search: string;
    setSearch: (v: string) => void;
    sortDir: "asc" | "desc";
    setSortDir: (v: "asc" | "desc") => void;
}

function FilesFilterBar({
    labelFilter, setLabelFilter, search, setSearch, sortDir, setSortDir,
}: Readonly<FilesFilterBarProps>) {
    return (
        <>
            <Group gap="sm" wrap="wrap">
                <TextInput
                    placeholder="Search files…"
                    leftSection={<IconSearch size={16} />}
                    rightSection={
                        search ? (
                            <IconX size={14} style={{ cursor: "pointer" }} onClick={() => setSearch("")} />
                        ) : undefined
                    }
                    size="sm"
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    style={{ flex: 1, minWidth: 180 }}
                />
                <SegmentedControl
                    size="xs"
                    value={labelFilter ?? "all"}
                    onChange={(v) => setLabelFilter(v === "all" ? undefined : (v as FileLabel))}
                    data={[
                        { label: "All", value: "all" },
                        ...FILE_LABELS.map((l) => ({ label: FILE_LABEL_DISPLAY[l], value: l })),
                    ]}
                />
            </Group>
            <Group gap="xs">
                <Box
                    component="button"
                    onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                    style={{
                        all: "unset", cursor: "pointer", display: "inline-flex",
                        alignItems: "center", gap: 4,
                        fontSize: "var(--mantine-font-size-xs)",
                        color: "var(--mantine-color-dimmed)",
                    }}
                >
                    {sortDir === "asc" ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
                    {sortDir === "asc" ? "Oldest" : "Newest"}
                </Box>
            </Group>
        </>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function FilesContent({
    initialFilters,
}: Readonly<{ initialFilters?: FilesInitialFilters }>) {
    const [labelFilter, setLabelFilter] = useState<FileLabel | undefined>(initialFilters?.label);
    const [search, setSearch] = useState(initialFilters?.q ?? "");
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const [sortDir, setSortDir] = useState<"asc" | "desc">(initialFilters?.sortDir ?? "desc");

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFilesQuery({
        label: labelFilter,
        q: debouncedSearch || undefined,
        sortDir,
    });

    const files = data?.pages.flatMap((p) => p.files) ?? [];
    const totalCount = debouncedSearch ? undefined : data?.pages[0]?.totalCount;
    const { handleDelete, isDeletePending, pendingDeleteFileId } = useFilesActions();
    const hasFilters = !!labelFilter || !!debouncedSearch;

    return (
        <Container pt="md">
            <Stack>
                {/* ── Header ──────────────────────────────────────── */}
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconFolder size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Files</Title>
                            <Text size="xs" c="dimmed">
                                All files you&apos;ve uploaded across your chat sessions
                            </Text>
                        </Box>
                    </Group>
                    {!isLoading && totalCount != null && totalCount > 0 && (
                        <Badge variant="light" color="gray" size="sm" radius="xl">
                            {totalCount} {totalCount === 1 ? "file" : "files"}
                        </Badge>
                    )}
                </Group>

                <StorageBar />
                <FilesFilterBar
                    labelFilter={labelFilter} setLabelFilter={setLabelFilter}
                    search={search} setSearch={setSearch}
                    sortDir={sortDir} setSortDir={setSortDir}
                />

                {/* ── Scrollable content ─────────────────────────── */}
                <Box style={{ flex: 1, overflow: "hidden" }}>
                    <ScrollArea style={{ height: "100%" }}>
                        <Box maw={1080} mx="auto">
                            {isLoading && (
                                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
                                    {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"].map((k) => (
                                        <Skeleton key={k} height={140} radius="md" />
                                    ))}
                                </SimpleGrid>
                            )}
                            {!isLoading && files.length === 0 && (
                                hasFilters ? (
                                    <Text ta="center" c="dimmed" py="xl">No files match your filters.</Text>
                                ) : (
                                    <EmptyFiles />
                                )
                            )}
                            {!isLoading && files.length > 0 && (
                                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
                                    {files.map((file) => (
                                        <FileCard
                                            key={file.id}
                                            file={file}
                                            isPendingDelete={isDeletePending && pendingDeleteFileId === file.id}
                                            isOptimistic={file.id.startsWith("__optimistic__")}
                                            onDelete={() => handleDelete(file)}
                                        />
                                    ))}
                                </SimpleGrid>
                            )}
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