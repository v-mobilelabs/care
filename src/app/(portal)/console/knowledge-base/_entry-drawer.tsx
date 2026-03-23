"use client";

import {
    Badge,
    Box,
    Button,
    Drawer,
    Group,
    ScrollArea,
    Select,
    Stack,
    TagsInput,
    Text,
    TextInput,
    Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconEdit, IconExternalLink, IconTag } from "@tabler/icons-react";
import type { KBEntryType, KnowledgeBaseDto } from "@/data/knowledge-base/models/knowledge-base.model";
import { KB_ENTRY_TYPES } from "@/data/knowledge-base/models/knowledge-base.model";
import { useKBUpdateMutation } from "./_query";

// ── View mode ─────────────────────────────────────────────────────────────────

function ViewMode({
    entry,
    onSwitchToEdit,
}: Readonly<{ entry: KnowledgeBaseDto; onSwitchToEdit: () => void }>) {
    return (
        <Stack gap="md">
            <Group justify="space-between" align="center">
                <Text fw={700} size="lg">{entry.title}</Text>
                <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={onSwitchToEdit}
                >
                    Edit
                </Button>
            </Group>

            <Group gap={6}>
                <Badge color="primary" variant="light" size="sm">{entry.type}</Badge>
                <Badge color="gray" variant="light" size="sm">{entry.category}</Badge>
                {entry.subcategory && (
                    <Badge color="gray" variant="dot" size="sm">{entry.subcategory}</Badge>
                )}
                {entry.status === "archived" && (
                    <Badge color="red" variant="light" size="sm">Archived</Badge>
                )}
            </Group>

            {entry.source && (
                <Group gap={4}>
                    <Text size="xs" c="dimmed" fw={600}>Source:</Text>
                    <Text size="xs" c="dimmed">{entry.source}</Text>
                </Group>
            )}

            {entry.sourceUrl && (
                <Group gap={4}>
                    <IconExternalLink size={12} color="var(--mantine-color-dimmed)" />
                    <Text
                        component="a"
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="xs"
                        c="primary"
                        td="underline"
                    >
                        {entry.sourceUrl}
                    </Text>
                </Group>
            )}

            <Box>
                <Text size="xs" fw={600} c="dimmed" mb={4}>Content</Text>
                <Text
                    size="sm"
                    style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
                        borderRadius: 8,
                        padding: 12,
                    }}
                >
                    {entry.content}
                </Text>
            </Box>

            {entry.tags.length > 0 && (
                <Box>
                    <Group gap={4} mb={4}>
                        <IconTag size={12} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" fw={600} c="dimmed">Tags</Text>
                    </Group>
                    <Group gap={4}>
                        {entry.tags.map((tag) => (
                            <Badge key={tag} size="xs" variant="outline" color="gray">{tag}</Badge>
                        ))}
                    </Group>
                </Box>
            )}

            <Group gap="xl">
                <Box>
                    <Text size="xs" c="dimmed">Created</Text>
                    <Text size="xs">{new Date(entry.createdAt).toLocaleString()}</Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Updated</Text>
                    <Text size="xs">{new Date(entry.updatedAt).toLocaleString()}</Text>
                </Box>
            </Group>
        </Stack>
    );
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

function EditMode({
    entry,
    onClose,
}: Readonly<{ entry: KnowledgeBaseDto; onClose: () => void }>) {
    const updateMutation = useKBUpdateMutation();

    const form = useForm({
        initialValues: {
            title: entry.title,
            type: entry.type as string,
            category: entry.category,
            subcategory: entry.subcategory ?? "",
            content: entry.content,
            tags: entry.tags,
            source: entry.source ?? "",
            sourceUrl: entry.sourceUrl ?? "",
            status: entry.status as string,
        },
    });

    function handleSubmit(values: typeof form.values) {
        updateMutation.mutate(
            {
                id: entry.id,
                title: values.title,
                type: values.type as KBEntryType,
                category: values.category,
                subcategory: values.subcategory || undefined,
                content: values.content,
                tags: values.tags,
                source: values.source || undefined,
                sourceUrl: values.sourceUrl || undefined,
                status: values.status as "active" | "archived",
            },
            { onSuccess: onClose },
        );
    }

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
                <TextInput
                    label="Title"
                    required
                    {...form.getInputProps("title")}
                />
                <Group grow>
                    <Select
                        label="Type"
                        allowDeselect={false}
                        data={KB_ENTRY_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                        {...form.getInputProps("type")}
                    />
                    <Select
                        label="Status"
                        allowDeselect={false}
                        data={[
                            { value: "active", label: "Active" },
                            { value: "archived", label: "Archived" },
                        ]}
                        {...form.getInputProps("status")}
                    />
                </Group>
                <Group grow>
                    <TextInput label="Category" required {...form.getInputProps("category")} />
                    <TextInput label="Subcategory" {...form.getInputProps("subcategory")} />
                </Group>
                <Textarea
                    label="Content"
                    required
                    autosize
                    minRows={6}
                    maxRows={16}
                    {...form.getInputProps("content")}
                />
                <TagsInput
                    label="Tags"
                    placeholder="Press Enter to add"
                    {...form.getInputProps("tags")}
                />
                <Group grow>
                    <TextInput label="Source" placeholder="e.g. AHA 2024" {...form.getInputProps("source")} />
                    <TextInput label="Source URL" placeholder="https://..." {...form.getInputProps("sourceUrl")} />
                </Group>
                <Group justify="flex-end" mt="sm">
                    <Button variant="subtle" type="button" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={updateMutation.isPending}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export function KBEntryDrawer({
    entry,
    mode,
    opened,
    onClose,
    onSwitchToEdit,
}: Readonly<{
    entry: KnowledgeBaseDto | null;
    mode: "view" | "edit";
    opened: boolean;
    onClose: () => void;
    onSwitchToEdit: () => void;
}>) {
    if (!entry) return null;

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={mode === "view" ? "Entry Details" : "Edit Entry"}
            position="right"
            size="lg"
            padding="md"
        >
            <ScrollArea style={{ height: "calc(100vh - 100px)" }} offsetScrollbars>
                {mode === "view" ? (
                    <ViewMode entry={entry} onSwitchToEdit={onSwitchToEdit} />
                ) : (
                    <EditMode entry={entry} onClose={onClose} />
                )}
            </ScrollArea>
        </Drawer>
    );
}
