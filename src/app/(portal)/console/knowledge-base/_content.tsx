"use client";

import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Menu,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
} from "@mantine/core";
import {
    IconBook2,
    IconDots,
    IconEdit,
    IconEye,
    IconPlus,
    IconSearch,
    IconTag,
    IconTrash,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { useState } from "react";
import type { KBEntryType, KnowledgeBaseDto } from "@/data/knowledge-base/models/knowledge-base.model";
import { KB_ENTRY_TYPES } from "@/data/knowledge-base/models/knowledge-base.model";
import { colors } from "@/ui/tokens";
import {
    iosCard,
    iosLargeTitle,
    iosSubtitle,
    ios,
    allKeyframes,
} from "@/ui/ios";
import { useKBListQuery, useKBDeleteMutation } from "./_query";
import { KBEntryDrawer } from "./_entry-drawer";
import { KBCreateModal } from "./_create-modal";

// ── Type badge colors ─────────────────────────────────────────────────────────

function typeBadgeColor(type: KBEntryType): string {
    const map: Record<KBEntryType, string> = {
        guideline: "primary",
        article: "cyan",
        drug: colors.warning,
        protocol: "teal",
        reference: "grape",
        file: colors.muted,
        other: "gray",
    };
    return map[type] ?? "gray";
}

// ── Entry card ────────────────────────────────────────────────────────────────

function KBEntryCard({
    entry,
    onView,
    onEdit,
    onDelete,
}: Readonly<{
    entry: KnowledgeBaseDto;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}>) {
    return (
        <Box style={iosCard} p="md">
            <Stack gap="xs">
                {/* Header row */}
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="sm" lineClamp={1}>
                            {entry.title}
                        </Text>
                        <Group gap={6}>
                            <Badge size="xs" color={typeBadgeColor(entry.type)} variant="light">
                                {entry.type}
                            </Badge>
                            <Badge size="xs" color="gray" variant="light">
                                {entry.category}
                            </Badge>
                        </Group>
                    </Stack>
                    <Menu shadow="md" position="bottom-end" withArrow>
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="sm">
                                <IconDots size={14} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEye size={14} />} onClick={onView}>
                                View
                            </Menu.Item>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                                Edit
                            </Menu.Item>
                            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
                                Delete
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>

                {/* Content preview */}
                <Text size="xs" c="dimmed" lineClamp={3}>
                    {entry.content}
                </Text>

                {/* Tags */}
                {entry.tags.length > 0 && (
                    <Group gap={4}>
                        <IconTag size={12} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed" lineClamp={1}>
                            {entry.tags.slice(0, 5).join(", ")}
                            {entry.tags.length > 5 && ` +${entry.tags.length - 5}`}
                        </Text>
                    </Group>
                )}

                {/* Footer */}
                <Group justify="space-between">
                    {entry.source && (
                        <Text size="xs" c="dimmed" fs="italic">
                            {entry.source}
                        </Text>
                    )}
                    <Text size="xs" c="dimmed">
                        {new Date(entry.createdAt).toLocaleDateString()}
                    </Text>
                </Group>
            </Stack>
        </Box>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function KnowledgeBaseContent() {
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [createOpened, createHandlers] = useDisclosure(false);
    const [drawerEntry, setDrawerEntry] = useState<KnowledgeBaseDto | null>(null);
    const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
    const [drawerOpened, drawerHandlers] = useDisclosure(false);

    const filters = typeFilter !== "all" ? { type: typeFilter as KBEntryType } : undefined;
    const { data, isLoading, isError } = useKBListQuery({ ...filters, limit: 50 });
    const deleteMutation = useKBDeleteMutation();

    // Filter by search locally
    const entries = (data?.entries ?? []).filter((e) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            e.title.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q))
        );
    });

    function handleView(entry: KnowledgeBaseDto) {
        setDrawerEntry(entry);
        setDrawerMode("view");
        drawerHandlers.open();
    }

    function handleEdit(entry: KnowledgeBaseDto) {
        setDrawerEntry(entry);
        setDrawerMode("edit");
        drawerHandlers.open();
    }

    function handleDelete(entry: KnowledgeBaseDto) {
        modals.openConfirmModal({
            title: "Delete entry",
            children: (
                <Text size="sm">
                    Are you sure you want to delete <strong>{entry.title}</strong>? This action cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => deleteMutation.mutate(entry.id),
        });
    }

    return (
        <Stack gap="md" p="md">
            <style>{allKeyframes}</style>

            {/* Page header */}
            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Group justify="space-between" align="flex-start">
                    <Box>
                        <Group gap="sm" align="center">
                            <ThemeIcon size={36} radius="md" color="primary" variant="light">
                                <IconBook2 size={20} />
                            </ThemeIcon>
                            <Text style={iosLargeTitle}>Knowledge Base</Text>
                        </Group>
                        <Text style={{ ...iosSubtitle, marginTop: 4 }}>
                            Manage clinical guidelines, protocols, and reference documents for AI retrieval.
                        </Text>
                    </Box>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={createHandlers.open}
                    >
                        Add Entry
                    </Button>
                </Group>
            </Box>

            {/* Search + filter bar */}
            <Group gap="sm" style={{ animation: ios.animation.fadeSlideUp("60ms") }}>
                <TextInput
                    placeholder="Search entries…"
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    style={{ flex: 1, minWidth: 200 }}
                />
                <SegmentedControl
                    value={typeFilter}
                    onChange={setTypeFilter}
                    data={[
                        { label: "All", value: "all" },
                        ...KB_ENTRY_TYPES.map((t) => ({
                            label: t.charAt(0).toUpperCase() + t.slice(1),
                            value: t,
                        })),
                    ]}
                    size="xs"
                />
            </Group>

            {/* Content */}
            {isLoading && (
                <Group justify="center" py="xl">
                    <Loader size="md" />
                </Group>
            )}

            {isError && (
                <Text c="red" ta="center" py="xl">
                    Failed to load knowledge base entries.
                </Text>
            )}

            {!isLoading && !isError && entries.length === 0 && (
                <Stack align="center" py="xl" gap="sm">
                    <ThemeIcon size={48} radius="xl" color="gray" variant="light">
                        <IconBook2 size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" size="sm">
                        {search ? "No entries match your search." : "No entries yet. Add your first knowledge base entry."}
                    </Text>
                </Stack>
            )}

            {!isLoading && !isError && entries.length > 0 && (
                <>
                    <Text size="xs" c="dimmed">
                        {entries.length} {entries.length === 1 ? "entry" : "entries"}
                        {data?.totalCount && data.totalCount > entries.length && ` of ${data.totalCount}`}
                    </Text>
                    <SimpleGrid
                        cols={{ base: 1, sm: 2, md: 3 }}
                        spacing="md"
                        style={{ animation: ios.animation.fadeSlideUp("120ms") }}
                    >
                        {entries.map((entry) => (
                            <KBEntryCard
                                key={entry.id}
                                entry={entry}
                                onView={() => handleView(entry)}
                                onEdit={() => handleEdit(entry)}
                                onDelete={() => handleDelete(entry)}
                            />
                        ))}
                    </SimpleGrid>
                </>
            )}

            {/* Drawer for view/edit */}
            <KBEntryDrawer
                entry={drawerEntry}
                mode={drawerMode}
                opened={drawerOpened}
                onClose={drawerHandlers.close}
                onSwitchToEdit={() => setDrawerMode("edit")}
            />

            {/* Create modal */}
            <KBCreateModal opened={createOpened} onClose={createHandlers.close} />
        </Stack>
    );
}
