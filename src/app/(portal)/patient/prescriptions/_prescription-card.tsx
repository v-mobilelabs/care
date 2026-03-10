import { ActionIcon, Badge, Box, Button, Divider, Group, Image, Paper, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconCapsule, IconDownload, IconExternalLink, IconFileTypePdf, IconPhoto, IconSparkles, IconTrash } from "@tabler/icons-react";

import { type FileRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { formatBytes, formatDate } from "@/lib/format";

export function PrescriptionCard({ file, isPendingDelete, isExtracting, onDelete, onExtract, onViewMeds }: Readonly<{
    file: FileRecord;
    isPendingDelete: boolean;
    isExtracting: boolean;
    onDelete: () => void;
    onExtract: () => void;
    onViewMeds: () => void;
}>) {
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    const extractedCount = file.extractedData?.medications.length ?? 0;
    const hasExtracted = extractedCount > 0;

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
                    aspectRatio: "4/3",
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
                    <ThemeIcon size={44} radius="xl" color={isPdf ? colors.danger : "primary"} variant="light">
                        {isPdf ? <IconFileTypePdf size={22} /> : <IconPhoto size={22} />}
                    </ThemeIcon>
                )}

                {/* Badge */}
                <Badge
                    size="xs"
                    color={isPdf ? colors.danger : "primary"}
                    variant="filled"
                    radius="sm"
                    style={{ position: "absolute", top: 8, right: 8 }}
                >
                    {isPdf ? "PDF" : file.mimeType.split("/")[1]?.toUpperCase() ?? "Image"}
                </Badge>
            </Box>

            <Divider />

            {/* Metadata */}
            <Box px="sm" py="xs" style={{ flex: 1 }}>
                <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Tooltip label={file.name} withArrow openDelay={400} multiline maw={240}>
                        <Text size="sm" fw={600} truncate="end" style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                            {file.name}
                        </Text>
                    </Tooltip>
                </Group>
                <Group gap={4} mt={2}>
                    <Text size="xs" c="dimmed">{formatBytes(file.size)}</Text>
                    <Text size="xs" c="dimmed">·</Text>
                    <Text size="xs" c="dimmed">{formatDate(file.createdAt)}</Text>
                </Group>
            </Box>

            {/* Extracted medications badge */}
            {hasExtracted && (
                <Box px="sm" pb="xs">
                    <Button
                        size="xs"
                        variant="light"
                        color={colors.success}
                        leftSection={<IconCapsule size={12} />}
                        onClick={onViewMeds}
                        fullWidth
                    >
                        {extractedCount} medication{extractedCount === 1 ? "" : "s"} found
                    </Button>
                </Box>
            )}

            {/* Actions */}
            <Group gap={4} px="sm" pb="sm" justify="flex-end">
                <Tooltip label={hasExtracted ? "Re-extract with AI" : "Extract medications with AI"} withArrow>
                    <ActionIcon
                        size={28}
                        variant="light"
                        color="primary"
                        onClick={onExtract}
                        loading={isExtracting}
                        disabled={isPendingDelete}
                        aria-label="Extract prescription"
                    >
                        <IconSparkles size={14} />
                    </ActionIcon>
                </Tooltip>
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
                                aria-label="Open prescription"
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
                                aria-label="Download prescription"
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
                        disabled={isPendingDelete || isExtracting}
                        aria-label="Delete prescription"
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}
