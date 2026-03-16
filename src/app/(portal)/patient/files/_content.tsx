"use client";
import {
    Badge,
    Box,
    Card,
    Container,
    Group,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconFolder } from "@tabler/icons-react";

import { useFilesQuery, useDeleteFileMutation, type FileRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { StorageBar } from "./_storage-bar";
import { FileCard } from "./_file-card";
import { EmptyFiles } from "./_empty-files";

// ── Main content ──────────────────────────────────────────────────────────────

export function FilesContent() {
    const { data: files = [], isLoading } = useFilesQuery();
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
                    { sessionId: file.sessionId, fileId: file.id },
                    {
                        onSuccess: () =>
                            notifications.show({
                                message: `${file.name} deleted.`,
                                color: colors.success,
                                icon: <IconCheck size={16} />,
                            }),
                    },
                );
            },
        });
    }

    return (
        <Container pt="md">
            <Card radius="xl" withBorder>
                <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="md" withBorder>
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
                        {!isLoading && files.length > 0 && (
                            <Badge variant="light" color="gray" size="sm" radius="xl">
                                {files.length} {files.length === 1 ? "file" : "files"}
                            </Badge>
                        )}
                    </Group>
                </Card.Section>
                <Card.Section p="md" withBorder>
                    <StorageBar />
                </Card.Section>
                <Card.Section p="md">
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box maw={1080} mx="auto">
                                {/* Loading skeletons */}
                                {isLoading && (
                                    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
                                        {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"].map((k) => (
                                            <Skeleton key={k} height={240} radius="lg" />
                                        ))}
                                    </SimpleGrid>
                                )}

                                {/* Empty state */}
                                {!isLoading && files.length === 0 && <EmptyFiles />}

                                {/* File grid */}
                                {!isLoading && files.length > 0 && (
                                    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
                                        {files.map((file) => (
                                            <FileCard
                                                key={file.id}
                                                file={file}
                                                isPendingDelete={
                                                    deleteFile.isPending &&
                                                    deleteFile.variables?.fileId === file.id
                                                }
                                                onDelete={() => handleDelete(file)}
                                            />
                                        ))}
                                    </SimpleGrid>
                                )}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Card.Section>
            </Card>
        </Container>
    );
}