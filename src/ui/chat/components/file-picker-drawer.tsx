"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    Drawer,
    Group,
    Image,
    Loader,
    Paper,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { Dropzone, type FileWithPath } from "@mantine/dropzone";
import {
    IconCamera,
    IconCheck,
    IconFile,
    IconFileTypePdf,
    IconFileWord,
    IconFolder,
    IconFolderOpen,
    IconPhoto,
    IconPlus,
    IconUpload,
    IconX,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import { useFilesQuery, type FileRecord } from "@/ui/chat/query";
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

function getFileIcon(mimeType: string, size = 22): React.ReactNode {
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

// ── File picker item ──────────────────────────────────────────────────────────

function FilePickerItem({
    file,
    selected,
    onToggle,
}: Readonly<{
    file: FileRecord;
    selected: boolean;
    onToggle: () => void;
}>) {
    const isImage = file.mimeType.startsWith("image/");
    const color = getFileColor(file.mimeType);

    return (
        <Paper
            withBorder
            radius="md"
            style={{
                overflow: "hidden",
                cursor: "pointer",
                outline: selected ? "2px solid var(--mantine-color-primary-6)" : "2px solid transparent",
                outlineOffset: 1,
                transition: "outline-color 120ms ease, box-shadow 120ms ease",
                boxShadow: selected ? "0 0 0 3px var(--mantine-color-primary-1)" : undefined,
            }}
            onClick={onToggle}
        >
            {/* Thumbnail */}
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
                        style={{ objectFit: "cover", position: "absolute", inset: 0, opacity: selected ? 0.85 : 1 }}
                        alt={file.name}
                    />
                ) : (
                    <ThemeIcon size={22} radius="xl" color={color} variant="light">
                        {getFileIcon(file.mimeType, 13)}
                    </ThemeIcon>
                )}

                {/* Type badge */}
                <Badge
                    size="xs"
                    color={color}
                    variant="filled"
                    radius="sm"
                    style={{ position: "absolute", top: 6, right: 6 }}
                >
                    {getMimeLabel(file.mimeType)}
                </Badge>

                {/* Selection checkmark overlay */}
                {selected && (
                    <Box
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(79, 70, 229, 0.18)",
                        }}
                    >
                        <ThemeIcon
                            size={18}
                            radius="xl"
                            color="primary"
                            variant="filled"
                            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
                        >
                            <IconCheck size={11} />
                        </ThemeIcon>
                    </Box>
                )}
            </Box>

            {/* Metadata row */}
            <Group gap={4} px={6} py={4} wrap="nowrap">
                <Checkbox
                    size="xs"
                    checked={selected}
                    onChange={onToggle}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flexShrink: 0 }}
                />
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <Tooltip label={file.name} withArrow openDelay={400} multiline maw={220}>
                        <Text size="xs" fw={600} truncate="end" lh={1.3}>
                            {file.name}
                        </Text>
                    </Tooltip>
                    <Text size="xs" c="dimmed">
                        {formatBytes(file.size)} · {formatDate(file.createdAt)}
                    </Text>
                </Box>
            </Group>
        </Paper>
    );
}

// ── Upload drop zone ──────────────────────────────────────────────────────────

function UploadZone({ onDrop }: Readonly<{ onDrop: (files: File[]) => void }>) {
    return (
        <Dropzone
            onDrop={onDrop}
            accept={[
                "image/*",
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]}
            maxSize={10 * 1024 * 1024}
            radius="md"
            styles={{
                root: {
                    border: "2px dashed light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                    transition: "border-color 150ms ease, background 150ms ease",
                },
            }}
        >
            <Group justify="center" gap="sm" py="lg" style={{ pointerEvents: "none" }}>
                <Dropzone.Accept>
                    <ThemeIcon size={40} radius="xl" color="primary" variant="light">
                        <IconUpload size={20} />
                    </ThemeIcon>
                </Dropzone.Accept>
                <Dropzone.Reject>
                    <ThemeIcon size={40} radius="xl" color="red" variant="light">
                        <IconX size={20} />
                    </ThemeIcon>
                </Dropzone.Reject>
                <Dropzone.Idle>
                    <ThemeIcon size={40} radius="xl" color="gray" variant="light">
                        <IconUpload size={20} />
                    </ThemeIcon>
                </Dropzone.Idle>
                <Stack gap={2} align="center">
                    <Text size="sm" fw={600}>Drop files here or click to browse</Text>
                    <Text size="xs" c="dimmed">Images, PDF, DOCX · max 10 MB each</Text>
                </Stack>
            </Group>
        </Dropzone>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FilePickerDrawerProps {
    opened: boolean;
    onClose: () => void;
    /** Called when the user confirms their selection. Returns selected `FileRecord`s
     *  and any freshly chosen local `File`s to upload. */
    onConfirm: (selected: FileRecord[], newFiles: File[]) => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function FilePickerDrawer({ opened, onClose, onConfirm }: Readonly<FilePickerDrawerProps>) {
    const { data: files = [], isLoading } = useFilesQuery();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const browseInputRef = useRef<HTMLInputElement>(null);

    function handleCameraClick() { cameraInputRef.current?.click(); }
    function handleGalleryClick() { galleryInputRef.current?.click(); }
    function handleBrowseClick() { browseInputRef.current?.click(); }

    function toggleFile(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function addPendingFiles(newFiles: FileWithPath[] | File[]) {
        setPendingFiles((prev) => [...prev, ...newFiles]);
    }

    function removePending(index: number) {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function handleConfirm() {
        const selectedRecords = files.filter((f) => selectedIds.has(f.id));
        onConfirm(selectedRecords, pendingFiles);
        // Reset state
        setSelectedIds(new Set());
        setPendingFiles([]);
        onClose();
    }

    function handleClose() {
        setSelectedIds(new Set());
        setPendingFiles([]);
        onClose();
    }

    const totalSelected = selectedIds.size + pendingFiles.length;

    return (
        <Drawer
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="sm">
                    <ThemeIcon size={28} radius="md" color="primary" variant="light">
                        <IconFolder size={16} />
                    </ThemeIcon>
                    <Box>
                        <Title order={5} lh={1.2}>Add files</Title>
                        <Text size="xs" c="dimmed">Pick existing files or upload new ones</Text>
                    </Box>
                </Group>
            }
            position="bottom"
            size="75vh"
            radius="lg"
            styles={{
                body: { padding: 0, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
                content: { display: "flex", flexDirection: "column" },
                header: { paddingBottom: 8, flexShrink: 0 },
            }}
        >
            <ScrollArea style={{ flex: 1 }} px="md">
                {/* Hidden native inputs */}
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf,.docx" multiple style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files) addPendingFiles(Array.from(e.target.files)); e.target.value = ""; }} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files) addPendingFiles(Array.from(e.target.files)); e.target.value = ""; }} />
                <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files) addPendingFiles(Array.from(e.target.files)); e.target.value = ""; }} />
                <input ref={browseInputRef} type="file" accept="*/*" multiple style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files) addPendingFiles(Array.from(e.target.files)); e.target.value = ""; }} />

                {/* Mobile-first quick-action tiles */}
                <SimpleGrid cols={3} spacing="sm" py="md">
                    {([
                        { label: "Camera", icon: <IconCamera size={22} />, color: "violet", onClick: handleCameraClick },
                        { label: "Photo Library", icon: <IconPhoto size={22} />, color: "primary", onClick: handleGalleryClick },
                        { label: "Browse Files", icon: <IconFolderOpen size={22} />, color: "teal", onClick: handleBrowseClick },
                    ] as const).map(({ label, icon, color, onClick }) => (
                        <Paper
                            key={label}
                            withBorder
                            radius="lg"
                            p="sm"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 8,
                                cursor: "pointer",
                                userSelect: "none",
                                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                                transition: "background 120ms ease",
                            }}
                            onClick={onClick}
                        >
                            <ThemeIcon size={44} radius="xl" color={color} variant="light">
                                {icon}
                            </ThemeIcon>
                            <Text size="xs" fw={600} ta="center" lh={1.2}>{label}</Text>
                        </Paper>
                    ))}
                </SimpleGrid>

                {/* Desktop drag-and-drop zone */}
                <Box pb="sm">
                    <UploadZone onDrop={addPendingFiles} />
                </Box>

                {/* Pending (new) files */}
                {pendingFiles.length > 0 && (
                    <Box mb="md">
                        <Group gap={6} mb="xs">
                            <Text size="sm" fw={600}>New uploads</Text>
                            <Badge size="xs" variant="light" color="primary">{pendingFiles.length}</Badge>
                        </Group>
                        <Stack gap={8}>
                            {pendingFiles.map((f, i) => (
                                <Paper key={`${f.name}-${i}`} withBorder radius="md" px="sm" py={8}>
                                    <Group gap={10} wrap="nowrap">
                                        <ThemeIcon size={32} radius="md" color={getFileColor(f.type)} variant="light" style={{ flexShrink: 0 }}>
                                            {getFileIcon(f.type, 18)}
                                        </ThemeIcon>
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="xs" fw={600} truncate="end">{f.name}</Text>
                                            <Text size="xs" c="dimmed">{formatBytes(f.size)}</Text>
                                        </Box>
                                        <ActionIcon
                                            size={24}
                                            variant="subtle"
                                            color="red"
                                            onClick={() => removePending(i)}
                                            aria-label="Remove file"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <IconX size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                )}

                {/* Existing files from server */}
                <Box mb="xl">
                    <Group gap={6} mb="xs">
                        <Text size="sm" fw={600}>My files</Text>
                        {!isLoading && (
                            <Badge size="xs" variant="light" color="gray">{files.length}</Badge>
                        )}
                        {selectedIds.size > 0 && (
                            <Badge size="xs" variant="filled" color="primary">{selectedIds.size} selected</Badge>
                        )}
                    </Group>

                    {isLoading && (
                        <SimpleGrid cols={{ base: 3, xs: 5, sm: 7 }} spacing={6}>
                            {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"].map((k) => (
                                <Skeleton key={k} height={80} radius="md" />
                            ))}
                        </SimpleGrid>
                    )}

                    {!isLoading && files.length === 0 && (
                        <Box
                            py="xl"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
                                <IconFolder size={24} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" ta="center">
                                No files uploaded yet. Drop files above to get started.
                            </Text>
                        </Box>
                    )}

                    {!isLoading && files.length > 0 && (
                        <SimpleGrid cols={{ base: 3, xs: 5, sm: 7 }} spacing={6}>
                            {files.map((file) => (
                                <FilePickerItem
                                    key={file.id}
                                    file={file}
                                    selected={selectedIds.has(file.id)}
                                    onToggle={() => toggleFile(file.id)}
                                />
                            ))}
                        </SimpleGrid>
                    )}
                </Box>
            </ScrollArea>

            {/* Footer */}
            <Divider />
            <Group justify="space-between" px="md" py="sm">
                <Button variant="subtle" color="gray" onClick={handleClose}>
                    Cancel
                </Button>
                <Button
                    color="primary"
                    disabled={totalSelected === 0}
                    leftSection={totalSelected > 0 ? <Badge size="xs" variant="white" color="primary" circle>{totalSelected}</Badge> : <IconPlus size={16} />}
                    onClick={handleConfirm}
                >
                    {totalSelected > 0 ? `Attach ${totalSelected} file${totalSelected > 1 ? "s" : ""}` : "Select files"}
                </Button>
            </Group>
        </Drawer>
    );
}
