"use client";
import { useState } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Group,
    Image,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
    IconDownload,
    IconExternalLink,
    IconEye,
    IconFile,
    IconFileTypePdf,
    IconFileWord,
    IconPhoto,
    IconTrash,
} from "@tabler/icons-react";

import { type FileRecord, type FileLabel } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { formatBytes } from "@/lib/format";
import { DateText } from "@/ui/DateText";

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

function openPreview(file: FileRecord) {
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    const modalSize = (() => {
        if (isImage) return "lg";
        if (isPdf) return "xl";
        return "sm";
    })();

    modals.open({
        title: file.name,
        size: modalSize,
        radius: "lg",
        children: (() => {
            if (isImage && file.downloadUrl) {
                return (
                    <Box>
                        <Image
                            src={file.downloadUrl}
                            alt={file.name}
                            radius="md"
                            style={{ maxHeight: "70vh", objectFit: "contain", width: "100%" }}
                        />
                        <Group justify="flex-end" mt="sm">
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                component="a"
                                href={file.downloadUrl}
                                download={file.name}
                                leftSection={<IconDownload size={14} />}
                            >
                                Download
                            </Button>
                        </Group>
                    </Box>
                );
            }
            if (isPdf && file.downloadUrl) {
                return (
                    <Box>
                        <Box
                            component="iframe"
                            src={file.downloadUrl}
                            style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }}
                            title={file.name}
                        />
                        <Group justify="flex-end" mt="sm">
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                component="a"
                                href={file.downloadUrl}
                                download={file.name}
                                leftSection={<IconDownload size={14} />}
                            >
                                Download
                            </Button>
                        </Group>
                    </Box>
                );
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

export function FileCard({ file, isPendingDelete, onDelete }: Readonly<{
    file: FileRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const isImage = file.mimeType.startsWith("image/");
    const color = getFileColor(file.mimeType);
    const [imgError, setImgError] = useState(false);

    return (
        <Card
            withBorder
            radius="lg"
            padding={0}
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                cursor: "pointer",
                overflow: "hidden",
            }}
            onClick={() => openPreview(file)}
        >
            {/* Thumbnail */}
            <Card.Section
                pos="relative"
                withBorder
                style={{
                    height: 96,
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                {isImage && (file.thumbnailUrl ?? file.downloadUrl) && !imgError ? (
                    <Image
                        src={file.thumbnailUrl ?? file.downloadUrl!}
                        alt={file.name}
                        style={{ width: "100%", height: 140, objectFit: "cover" }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <ThemeIcon size={80} radius="xl" color={color} variant="light">
                        {getFileIcon(file.mimeType, 40)}
                    </ThemeIcon>
                )}
                <Box pos="absolute" top={4} right={8}>
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
                <Box pos="absolute" bottom={4} right={8}>
                    <Badge size="xs" color="dark" variant="filled" radius="sm">
                        <DateText date={file.createdAt} />
                    </Badge>
                </Box>
            </Card.Section>

            {/* Info */}
            <Card.Section withBorder px="sm" pt="md" pb="xs">
                <Tooltip label={file.name} withArrow openDelay={400} multiline maw={280}>
                    <Text size="xs" fw={700} truncate="end" style={{ lineHeight: 1.4 }}>
                        {file.name}
                    </Text>
                </Tooltip>
                <Group gap={6} mt={8} wrap="wrap">
                    <Badge size="sm" color={color} variant="light" radius="sm">
                        {getMimeLabel(file.mimeType)}
                    </Badge>
                    <Badge size="sm" color={"dark"} variant="light" radius="sm">
                        {formatBytes(file.size)}
                    </Badge>
                </Group>
            </Card.Section>

            {/* Actions */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))" withBorder px="sm" py="xs">
                <Group gap={4} justify="space-between" align="center">
                    <Tooltip label="Preview" withArrow>
                        <ActionIcon
                            size={32}
                            variant="subtle"
                            color="gray"
                            onClick={(e) => { e.stopPropagation(); openPreview(file); }}
                            aria-label="Preview file"
                        >
                            <IconEye size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Open in new tab" withArrow>
                        <ActionIcon
                            size={32}
                            variant="subtle"
                            color="gray"
                            component="a"
                            href={file.downloadUrl as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open file"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconExternalLink size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Download" withArrow>
                        <ActionIcon
                            size={32}
                            variant="subtle"
                            color="primary"
                            component="a"
                            href={file.downloadUrl as string}
                            download={file.name}
                            aria-label="Download file"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconDownload size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete" withArrow>
                        <ActionIcon
                            size={32}
                            variant="subtle"
                            color="red"
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            disabled={isPendingDelete}
                            aria-label="Delete file"
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Card.Section>
        </Card>
    );
}
