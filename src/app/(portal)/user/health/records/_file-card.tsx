"use client";
import { useState } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Group,
    Image,
    Loader,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
    IconDownload,
    IconExternalLink,
    IconFile,
    IconFileTypePdf,
    IconFileWord,
    IconPhoto,
    IconTrash,
} from "@tabler/icons-react";

import { type FileRecord, type FileLabel } from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { formatBytes } from "@/lib/format";
import { DateText } from "@/ui/DateText";

import { trackEvent } from "@/lib/analytics";
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

const LABEL_DISPLAY: Record<FileLabel, string> = {
    xray: "X-Ray",
    blood_test: "Lab Report",
    prescription: "Prescription",
    scan: "Scan",
    report: "Report",
    vaccination: "Vaccination",
    other: "Other",
};

const LABEL_COLOR: Record<FileLabel, string> = {
    xray: "violet",
    blood_test: "red",
    prescription: "teal",
    scan: "indigo",
    report: "blue",
    vaccination: "green",
    other: "gray",
};

function PreviewLoader() {
    return (
        <Center py="xl">
            <Loader size="md" />
        </Center>
    );
}

function DownloadButton({ url, name }: Readonly<{ url: string; name: string }>) {
    return (
        <Group justify="flex-end" mt="sm">
            <Button
                size="xs" variant="light" color="primary"
                component="a" href={url} download={name}
                onClick={() =>
                    trackEvent({
                        name: "health_record_exported",
                        params: { artifact_type: "file" },
                    })
                }
                leftSection={<IconDownload size={14} />}
            >
                Download
            </Button>
        </Group>
    );
}

function ImagePreview({ file }: Readonly<{ file: FileRecord }>) {
    const [loading, setLoading] = useState(true);
    return (
        <Box>
            {loading && <PreviewLoader />}
            <Box
                style={{
                    width: "100%",
                    height: 480,
                    display: loading ? "none" : "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-7))",
                    borderRadius: "var(--mantine-radius-md)",
                    overflow: "hidden",
                }}
            >
                <Image
                    src={file.downloadUrl!} alt={file.name}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    onLoad={() => setLoading(false)}
                />
            </Box>
            <DownloadButton url={file.downloadUrl!} name={file.name} />
        </Box>
    );
}

function PdfPreview({ file }: Readonly<{ file: FileRecord }>) {
    const [loading, setLoading] = useState(true);
    return (
        <Box>
            {loading && <PreviewLoader />}
            <Box
                component="iframe" src={file.downloadUrl!} title={file.name}
                style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8, display: loading ? "none" : "block" }}
                onLoad={() => setLoading(false)}
            />
            <DownloadButton url={file.downloadUrl!} name={file.name} />
        </Box>
    );
}

function openPreview(file: FileRecord) {
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    const modalSize = (() => {
        if (isImage) return 720;
        if (isPdf) return "xl";
        return "sm";
    })();

    modals.open({
        title: file.name,
        size: modalSize,
        radius: "lg",
        children: (() => {
            if (isImage && file.downloadUrl) {
                return <ImagePreview file={file} />;
            }
            if (isPdf && file.downloadUrl) {
                return <PdfPreview file={file} />;
            }
            return (
                <Stack gap="sm" align="center" py="md">
                    <ThemeIcon size={64} radius="xl" color={getFileColor(file.mimeType)} variant="light">
                        {getFileIcon(file.mimeType, 32)}
                    </ThemeIcon>
                    <Text fw={600} ta="center">{file.name}</Text>
                    <Text size="sm" c="dimmed">{getMimeLabel(file.mimeType)} · {formatBytes(file.size)}</Text>
                    {file.downloadUrl && (
                        <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            component="a"
                            href={file.downloadUrl}
                            download={file.name}
                            leftSection={<IconDownload size={14} />}
                        >
                            Download
                        </Button>
                    )}
                </Stack>
            );
        })(),
    });
}

// ── Card sub-sections ─────────────────────────────────────────────────────────

function FileThumbnailSection({
    file,
    imgError,
    onImageError,
    onPreview,
}: Readonly<{
    file: FileRecord;
    imgError: boolean;
    onImageError: () => void;
    onPreview: () => void;
}>) {
    return (
        <Card.Section aria-label="View file">
            <Box
                component="button"
                onClick={onPreview}
                style={{ all: "unset", display: "flex", flexDirection: "column", width: "100%", cursor: "pointer" }}
            >
                <Box
                    style={{
                        width: "100%", height: 72,
                        background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, overflow: "hidden", position: "relative",
                    }}
                >
                    {(file.thumbnailUrl ?? file.downloadUrl) && !imgError ? (
                        <Image
                            src={file.thumbnailUrl ?? file.downloadUrl!} alt={file.name}
                            w="100%" h="100%" style={{ objectFit: "cover" }} onError={onImageError}
                        />
                    ) : (
                        <ThemeIcon size={32} radius="md" color={getFileColor(file.mimeType)} variant="light">
                            {getFileIcon(file.mimeType, 18)}
                        </ThemeIcon>
                    )}
                    <Box pos="absolute" top={4} right={6}>
                        {file.label ? (
                            <Badge size="xs" color={LABEL_COLOR[file.label]} variant="filled" radius="sm">
                                {LABEL_DISPLAY[file.label]}
                            </Badge>
                        ) : (
                            <Badge size="xs" color="warning" variant="filled" radius="sm">
                                Not Labeled
                            </Badge>
                        )}
                    </Box>
                </Box>
            </Box>
        </Card.Section>
    );
}

function FileActionsSection({
    file,
    isPendingDelete,
    onDelete,
    onPreview,
}: Readonly<{
    file: FileRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
    onPreview: () => void;
}>) {
    return (
        <Card.Section
            bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
            variant="light" withBorder px="sm"
        >
            <Group justify="space-between">
                <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    <DateText date={file.createdAt} />
                </Text>
                <Group gap={2} py={6} justify="flex-end">
                    {file.downloadUrl && (
                        <>
                            <Tooltip label="Open" withArrow>
                                <ActionIcon size={24} variant="subtle" color="gray" onClick={onPreview} aria-label="Open file">
                                    <IconExternalLink size={13} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Download" withArrow>
                                <ActionIcon size={24} variant="subtle" color="primary"
                                    component="a" href={file.downloadUrl} download={file.name} aria-label="Download file"
                                    onClick={() =>
                                        trackEvent({
                                            name: "health_record_exported",
                                            params: {
                                                artifact_type: "file",
                                                artifact_id: file.id,
                                            },
                                        })
                                    }>
                                    <IconDownload size={13} />
                                </ActionIcon>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip label="Delete" withArrow>
                        <ActionIcon size={24} variant="subtle" color="red"
                            onClick={onDelete} disabled={isPendingDelete} aria-label="Delete file">
                            <IconTrash size={13} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Card.Section>
    );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function FileCard({ file, isPendingDelete, onDelete, isOptimistic = false }: Readonly<{
    file: FileRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
    isOptimistic?: boolean;
}>) {
    const [imgError, setImgError] = useState(false);
    function handlePreview() { openPreview(file); }

    return (
        <Card
            radius="md"
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease, box-shadow 120ms ease",
                position: isOptimistic ? "relative" as const : undefined,
            }}
        >
            {isOptimistic && (
                <Box
                    style={{
                        position: "absolute", inset: 0, zIndex: 1,
                        borderRadius: "var(--mantine-radius-md)",
                        background: "light-dark(rgba(255,255,255,0.6), rgba(30,32,40,0.6))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Loader size="sm" />
                </Box>
            )}
            <FileThumbnailSection
                file={file} imgError={imgError}
                onImageError={() => setImgError(true)} onPreview={handlePreview}
            />
            {/* Info */}
            <Card.Section withBorder style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Stack gap={6} p="sm" style={{ flex: 1 }} component="div">
                    <Text size="xs" fw={600} truncate="end" lh={1.3}>{file.name}</Text>
                    <Group gap={4} wrap="wrap">
                        <Badge size="xs" color={getFileColor(file.mimeType)} variant="light" radius="sm">
                            {getMimeLabel(file.mimeType)}
                        </Badge>
                        <Badge size="xs" color="dark" variant="light" radius="sm">
                            {formatBytes(file.size)}
                        </Badge>
                    </Group>
                </Stack>
            </Card.Section>
            <FileActionsSection
                file={file} isPendingDelete={isPendingDelete}
                onDelete={onDelete} onPreview={handlePreview}
            />
        </Card>
    );
}
