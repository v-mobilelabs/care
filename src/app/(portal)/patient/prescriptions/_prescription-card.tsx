import { ActionIcon, Badge, Box, Card, Group, Image, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from "@mantine/core";
import { IconCapsule, IconDownload, IconExternalLink, IconMessageCircle, IconPhoto, IconSparkles, IconTrash } from "@tabler/icons-react";

import { type PrescriptionRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";

export function PrescriptionCard({ file, isPendingDelete, isExtracting, onDelete, onExtract, onOpenDetail, onAskAI }: Readonly<{
    file: PrescriptionRecord;
    isPendingDelete: boolean;
    isExtracting: boolean;
    onDelete: () => void;
    onExtract: () => void;
    onOpenDetail: () => void;
    onAskAI: () => void;
}>) {
    const medCount = file.medications.length;
    const hasMeds = medCount > 0;
    const isImage = file.fileUrl?.match(/\.(jpe?g|png|webp|gif)/i);

    const displayName = file.prescribedBy
        ? `Dr. ${file.prescribedBy}`
        : "Prescription";

    return (
        <Card
            radius="md"
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease, box-shadow 120ms ease",
            }}
        >
            {/* Clickable area: thumbnail + metadata → opens detail modal */}
            <Card.Section aria-label="View prescription details">
                <UnstyledButton onClick={onOpenDetail} style={{ display: "flex", flexDirection: "column", width: "100%", textAlign: "left" }}>
                    {/* Thumbnail */}
                    <Box
                        style={{
                            width: "100%",
                            height: 72,
                            background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden",
                        }}
                    >
                        {isImage && file.fileUrl ? (
                            <Image
                                src={file.fileUrl}
                                alt={displayName}
                                w="100%"
                                h="100%"
                                style={{ objectFit: "cover" }}
                            />
                        ) : (
                            <ThemeIcon size={32} radius="md" color="primary" variant="light">
                                <IconPhoto size={18} />
                            </ThemeIcon>
                        )}
                    </Box>
                </UnstyledButton>
            </Card.Section>
            <Card.Section withBorder style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                {/* Metadata */}
                <Stack gap={6} p="sm" style={{ flex: 1 }} component="div">
                    <Text size="xs" fw={600} truncate="end" lh={1.3}>
                        {displayName}
                    </Text>
                    <Group gap={4} wrap="wrap">
                        {hasMeds && (
                            <Badge
                                size="xs"
                                color={colors.success}
                                variant="light"
                                radius="sm"
                                leftSection={<IconCapsule size={9} />}
                            >
                                {medCount} med{medCount === 1 ? "" : "s"}
                            </Badge>
                        )}
                        {file.urgent && (
                            <Badge size="xs" color="red" variant="filled" radius="sm">
                                Urgent
                            </Badge>
                        )}
                    </Group>
                </Stack>
            </Card.Section>

            {/* Actions */}
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))" variant="light" withBorder px="sm">
                <Group justify="space-between">
                    <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                        <DateText date={file.createdAt} />
                    </Text>
                    <Group gap={2} py={6} justify="flex-end">
                        <Tooltip label={hasMeds ? "Re-extract" : "Extract with AI"} withArrow>
                            <ActionIcon
                                size={24}
                                variant="light"
                                color="primary"
                                onClick={onExtract}
                                loading={isExtracting}
                                disabled={isPendingDelete}
                                aria-label="Extract prescription"
                            >
                                <IconSparkles size={13} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Ask AI about this prescription" withArrow>
                            <ActionIcon
                                size={24}
                                variant="subtle"
                                color="primary"
                                onClick={onAskAI}
                                disabled={isPendingDelete}
                                aria-label="Ask AI"
                            >
                                <IconMessageCircle size={13} />
                            </ActionIcon>
                        </Tooltip>
                        {file.fileUrl && (
                            <>
                                <Tooltip label="Open" withArrow>
                                    <ActionIcon
                                        size={24}
                                        variant="subtle"
                                        color="gray"
                                        component="a"
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Open prescription"
                                    >
                                        <IconExternalLink size={13} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Download" withArrow>
                                    <ActionIcon
                                        size={24}
                                        variant="subtle"
                                        color="primary"
                                        component="a"
                                        href={file.fileUrl}
                                        download
                                        aria-label="Download prescription"
                                    >
                                        <IconDownload size={13} />
                                    </ActionIcon>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip label="Delete" withArrow>
                            <ActionIcon
                                size={24}
                                variant="subtle"
                                color="red"
                                onClick={onDelete}
                                disabled={isPendingDelete || isExtracting}
                                aria-label="Delete prescription"
                            >
                                <IconTrash size={13} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

            </Card.Section>
        </Card>
    );
}
