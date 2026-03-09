"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Center,
    Divider,
    Group,
    Image,
    Paper,
    Progress,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconDatabase,
    IconDownload,
    IconExternalLink,
    IconFile,
    IconFileTypePdf,
    IconFileWord,
    IconFolder,
    IconPhoto,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useFilesQuery, useDeleteFileMutation, useStorageMetricsQuery, type FileRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getFileIcon(mimeType: string, size = 28): React.ReactNode {
    if (mimeType === "application/pdf") return <IconFileTypePdf size={size} />;
    if (mimeType.startsWith("image/")) return <IconPhoto size={size} />;
    if (mimeType.includes("word")) return <IconFileWord size={size} />;
    return <IconFile size={size} />;
}

function getFileColor(mimeType: string): string {
    if (mimeType === "application/pdf") return colors.danger;
    if (mimeType.startsWith("image/")) return "primary";
    if (mimeType.includes("word")) return "blue";
    return "gray";
}

function getMimeLabel(mimeType: string): string {
    if (mimeType === "application/pdf") return "PDF";
    if (mimeType.startsWith("image/")) return mimeType.split("/")[1]?.toUpperCase() ?? "Image";
    if (mimeType.includes("word")) return "Word";
    return "File";
}

// ── Storage bar ────────────────────────────────────────────────────────────

function StorageBar() {
    const { data: metrics, isLoading } = useStorageMetricsQuery();

    if (isLoading) return <Skeleton height={52} radius="md" />;
    if (!metrics) return null;

    const usedMB = metrics.usedBytes / (1024 * 1024);
    const limitMB = metrics.limitBytes / (1024 * 1024);
    const pct = Math.min((metrics.usedBytes / metrics.limitBytes) * 100, 100);
    const barColor = pct >= 90 ? "red" : pct >= 75 ? "orange" : "primary";

    return (
        <Paper withBorder radius="md" p="sm">
            <Group gap="xs" mb={6}>
                <ThemeIcon size={20} radius="sm" color={barColor} variant="light">
                    <IconDatabase size={12} />
                </ThemeIcon>
                <Text size="xs" fw={600}>Storage</Text>
                <Text size="xs" c="dimmed" ml="auto">
                    {usedMB.toFixed(1)} MB of {limitMB.toFixed(0)} MB used
                </Text>
                <Badge size="xs" color={barColor} variant="light" radius="sm">
                    {pct.toFixed(0)}%
                </Badge>
            </Group>
            <Progress value={pct} color={barColor} size="sm" radius="xl" />
        </Paper>
    );
}

// ── File card ─────────────────────────────────────────────────────────────────

function FileCard({ file, isPendingDelete, onDelete }: Readonly<{
    file: FileRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const isImage = file.mimeType.startsWith("image/");
    const color = getFileColor(file.mimeType);

    return (
        <Paper
            withBorder
            radius="lg"
            style={{
                overflow: "hidden",
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease, box-shadow 120ms ease",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Preview */}
            <Box
                style={{
                    aspectRatio: "16/9",
                    background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {isImage && file.downloadUrl ? (
                    <Image
                        src={file.downloadUrl}
                        h="100%"
                        w="100%"
                        style={{ objectFit: "cover", position: "absolute", inset: 0 }}
                        alt={file.name}
                    />
                ) : (
                    <ThemeIcon size={56} radius="xl" color={color} variant="light">
                        {getFileIcon(file.mimeType)}
                    </ThemeIcon>
                )}

                {/* Type badge — top-right overlay */}
                <Badge
                    size="xs"
                    color={color}
                    variant="filled"
                    radius="sm"
                    style={{ position: "absolute", top: 8, right: 8 }}
                >
                    {getMimeLabel(file.mimeType)}
                </Badge>
            </Box>

            <Divider />

            {/* Metadata */}
            <Box px="sm" pt="sm" pb="xs" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <Tooltip label={file.name} withArrow openDelay={400} multiline maw={240}>
                    <Text size="sm" fw={600} truncate="end" style={{ lineHeight: 1.3 }}>
                        {file.name}
                    </Text>
                </Tooltip>
                <Group gap={6} mt={4}>
                    <Text size="xs" c="dimmed">{formatBytes(file.size)}</Text>
                    <Text size="xs" c="dimmed">·</Text>
                    <Text size="xs" c="dimmed">{formatDate(file.createdAt)}</Text>
                </Group>
            </Box>

            {/* Actions */}
            <Group gap={4} px="sm" pb="sm" justify="flex-end">
                {file.downloadUrl && (
                    <>
                        <Tooltip label="Open in new tab" withArrow>
                            <ActionIcon
                                size={28}
                                variant="subtle"
                                color="gray"
                                component="a"
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open file"
                            >
                                <IconExternalLink size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download" withArrow>
                            <ActionIcon
                                size={28}
                                variant="subtle"
                                color="primary"
                                component="a"
                                href={file.downloadUrl}
                                download={file.name}
                                aria-label="Download file"
                            >
                                <IconDownload size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </>
                )}
                <Tooltip label="Delete" withArrow>
                    <ActionIcon
                        size={28}
                        variant="subtle"
                        color="red"
                        onClick={onDelete}
                        disabled={isPendingDelete}
                        aria-label="Delete file"
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyFiles() {
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Center style={{ flex: 1, flexDirection: "column", gap: 16 }} py="xl">
            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
                <IconFolder size={32} />
            </ThemeIcon>
            <Stack gap={4} align="center">
                <Title order={4} c="dimmed">No files yet</Title>
                <Text size="sm" c="dimmed" ta="center" maw={320}>
                    Files you upload during a chat session will appear here.
                </Text>
            </Stack>
            <Button
                variant="light"
                color="primary"
                onClick={() => startTransition(() => router.push("/patient/assistant"))}
            >
                Start a new chat
            </Button>
        </Center>
    );
}

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
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
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
                {/* Storage usage */}
                <Box mt="sm">
                    <StorageBar />
                </Box>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={1080} mx="auto">
                        {/* Loading skeletons */}
                        {isLoading && (
                            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
                                {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"].map((k) => (
                                    <Skeleton key={k} height={200} radius="lg" />
                                ))}
                            </SimpleGrid>
                        )}

                        {/* Empty state */}
                        {!isLoading && files.length === 0 && <EmptyFiles />}

                        {/* File grid */}
                        {!isLoading && files.length > 0 && (
                            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
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
        </Box>
    );
}
