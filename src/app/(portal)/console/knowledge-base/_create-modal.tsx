"use client";

import {
    Button,
    Group,
    Modal,
    Select,
    Stack,
    TagsInput,
    TextInput,
    Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { KBEntryType } from "@/data/knowledge-base/models/knowledge-base.model";
import { KB_ENTRY_TYPES } from "@/data/knowledge-base/models/knowledge-base.model";
import { useKBCreateMutation } from "./_query";

export function KBCreateModal({
    opened,
    onClose,
}: Readonly<{ opened: boolean; onClose: () => void }>) {
    const createMutation = useKBCreateMutation();

    const form = useForm({
        initialValues: {
            title: "",
            type: "guideline" as string,
            category: "",
            subcategory: "",
            content: "",
            tags: [] as string[],
            source: "",
            sourceUrl: "",
        },
        validate: {
            title: (v) => (v.trim() ? null : "Title is required"),
            category: (v) => (v.trim() ? null : "Category is required"),
            content: (v) => (v.trim() ? null : "Content is required"),
        },
    });

    function handleSubmit(values: typeof form.values) {
        createMutation.mutate(
            {
                title: values.title.trim(),
                type: values.type as KBEntryType,
                category: values.category.trim(),
                subcategory: values.subcategory.trim() || undefined,
                content: values.content.trim(),
                tags: values.tags,
                source: values.source.trim() || undefined,
                sourceUrl: values.sourceUrl.trim() || undefined,
            },
            {
                onSuccess: () => {
                    form.reset();
                    onClose();
                },
            },
        );
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Add Knowledge Base Entry"
            size="lg"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="sm">
                    <TextInput
                        label="Title"
                        placeholder="Entry title"
                        required
                        {...form.getInputProps("title")}
                    />
                    <Group grow>
                        <Select
                            label="Type"
                            allowDeselect={false}
                            data={KB_ENTRY_TYPES.map((t) => ({
                                value: t,
                                label: t.charAt(0).toUpperCase() + t.slice(1),
                            }))}
                            {...form.getInputProps("type")}
                        />
                        <TextInput
                            label="Category"
                            placeholder="e.g. Cardiology"
                            required
                            {...form.getInputProps("category")}
                        />
                    </Group>
                    <TextInput
                        label="Subcategory"
                        placeholder="Optional subcategory"
                        {...form.getInputProps("subcategory")}
                    />
                    <Textarea
                        label="Content"
                        placeholder="Full text content — this will be embedded for AI retrieval"
                        required
                        autosize
                        minRows={6}
                        maxRows={16}
                        {...form.getInputProps("content")}
                    />
                    <TagsInput
                        label="Tags"
                        placeholder="Press Enter to add tags"
                        {...form.getInputProps("tags")}
                    />
                    <Group grow>
                        <TextInput
                            label="Source"
                            placeholder="e.g. AHA 2024, WHO"
                            {...form.getInputProps("source")}
                        />
                        <TextInput
                            label="Source URL"
                            placeholder="https://..."
                            {...form.getInputProps("sourceUrl")}
                        />
                    </Group>
                    <Group justify="flex-end" mt="sm">
                        <Button variant="subtle" type="button" onClick={onClose}>Cancel</Button>
                        <Button type="submit" loading={createMutation.isPending}>
                            Create Entry
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}
