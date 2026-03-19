"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Collapse,
    Container,
    Divider,
    FileButton,
    Group,
    Image,
    Modal,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconArrowDown,
    IconArrowUp,
    IconBuilding,
    IconCheck,
    IconCircleCheck,
    IconDownload,
    IconDroplet,
    IconEye,
    IconMapPin,
    IconRefresh,
    IconStethoscope,
    IconTrash,
    IconUpload,
} from "@tabler/icons-react";
import { type ReactNode, useRef } from "react";
import {
    useLabReportsQuery,
    useUploadLabReportMutation,
    useDeleteLabReportMutation,
    useReExtractLabReportMutation,
    type LabReportRecord,
    type BiomarkerStatus,
    type BiomarkerRecord,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";

// ── Biomarker helpers ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BiomarkerStatus, string> = {
    normal: colors.success,
    low: colors.warning,
    high: colors.warning,
    critical: colors.danger,
};

const STATUS_ICON: Record<BiomarkerStatus, ReactNode> = {
    normal: <IconCircleCheck size={12} />,
    low: <IconArrowDown size={12} />,
    high: <IconArrowUp size={12} />,
    critical: <IconAlertCircle size={12} />,
};

// ── Biomarker row ─────────────────────────────────────────────────────────────

function BiomarkerRow({ b }: Readonly<{ b: BiomarkerRecord }>) {
    return (
        <Group
            justify="space-between"
            gap="xs"
            py={4}
            style={{
                borderBottom:
                    "0.5px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
            }}
        >
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                    {b.name}
                </Text>
                {b.referenceRange && (
                    <Text size="xs" c="dimmed">
                        Ref: {b.referenceRange}
                    </Text>
                )}
            </Box>
            <Group gap={6} wrap="nowrap" align="center">
                <Text size="sm" fw={600} c={STATUS_COLOR[b.status]}>
                    {b.value} {b.unit}
                </Text>
                <Badge
                    size="xs"
                    variant="light"
                    color={(() => {
                        if (b.status === "normal") return "teal";
                        if (b.status === "critical") return "red";
                        return "yellow";
                    })()}
                    leftSection={STATUS_ICON[b.status]}
                >
                    {b.status}
                </Badge>
            </Group>
        </Group>
    );
}

// ── Source file modal ─────────────────────────────────────────────────────────

function SourceModal({
    record,
    opened,
    onClose,
}: Readonly<{
    record: LabReportRecord;
    opened: boolean;
    onClose: () => void;
}>) {
    const fileUrl = record.fileUrl ?? `/api/files/${record.fileId}`;
    const isImage = fileUrl.match(/\.(jpe?g|png|webp|gif)/i) !== null;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Text fw={600} size="sm" truncate="end" maw={320}>
                    {record.testName} — Source
                </Text>
            }
            size="xl"
            centered
            radius="lg"
        >
            <Stack gap="sm">
                {isImage ? (
                    <Image
                        src={fileUrl}
                        alt={record.testName}
                        radius="md"
                        style={{
                            maxHeight: "70vh",
                            objectFit: "contain",
                            width: "100%",
                        }}
                    />
                ) : (
                    <Box
                        component="iframe"
                        src={fileUrl}
                        style={{
                            width: "100%",
                            height: "70vh",
                            border: "none",
                            borderRadius: 8,
                        }}
                        title={record.testName}
                    />
                )}
                <Group justify="flex-end">
                    <Button
                        size="xs"
                        variant="light"
                        color="primary"
                        component="a"
                        href={fileUrl}
                        download
                        leftSection={<IconDownload size={14} />}
                    >
                        Download
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

// ── Lab report card ───────────────────────────────────────────────────────────

function LabReportCard({
    record,
    onDelete,
    onReExtract,
    isPendingDelete,
    isPendingReExtract,
}: Readonly<{
    record: LabReportRecord;
    onDelete: () => void;
    onReExtract: () => void;
    isPendingDelete: boolean;
    isPendingReExtract: boolean;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const [sourceOpen, { open: openSource, close: closeSource }] =
        useDisclosure(false);
    const abnormalCount = record.biomarkers.filter(
        (b) => b.status !== "normal",
    ).length;
    const criticalCount = record.biomarkers.filter(
        (b) => b.status === "critical",
    ).length;

    const hasMetadata =
        record.labName || record.orderedBy || record.labAddress;

    return (
        <Card radius="lg" withBorder p="md">
            <Group gap="xs" align="center">
                <ThemeIcon size={28} radius="md" variant="light" color="primary">
                    <IconDroplet size={15} />
                </ThemeIcon>
                <Text
                    fw={600}
                    size="sm"
                    lh={1.3}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {record.testName}
                </Text>
                <Group gap={4}>
                    <Tooltip label="View source">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={openSource}
                        >
                            <IconEye size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Re-extract with AI">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            loading={isPendingReExtract}
                            onClick={onReExtract}
                        >
                            <IconRefresh size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="red"
                            loading={isPendingDelete}
                            onClick={onDelete}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {/* Date */}
            <Group gap="xs" mt={6} wrap="wrap">
                {record.testDate && (
                    <Text size="xs" c="dimmed">
                        <DateText date={record.testDate} />
                    </Text>
                )}
            </Group>

            {/* Metadata: lab, doctor, address */}
            {hasMetadata && (
                <Stack gap={4} mt={8}>
                    {record.labName && (
                        <Group gap={6} wrap="nowrap">
                            <IconBuilding
                                size={13}
                                style={{ flexShrink: 0, opacity: 0.5 }}
                            />
                            <Text size="xs" c="dimmed" truncate>
                                {record.labName}
                            </Text>
                        </Group>
                    )}
                    {record.orderedBy && (
                        <Group gap={6} wrap="nowrap">
                            <IconStethoscope
                                size={13}
                                style={{ flexShrink: 0, opacity: 0.5 }}
                            />
                            <Text size="xs" c="dimmed" truncate>
                                Dr. {record.orderedBy}
                            </Text>
                        </Group>
                    )}
                    {record.labAddress && (
                        <Group gap={6} wrap="nowrap">
                            <IconMapPin
                                size={13}
                                style={{ flexShrink: 0, opacity: 0.5 }}
                            />
                            <Text size="xs" c="dimmed" truncate>
                                {record.labAddress}
                            </Text>
                        </Group>
                    )}
                </Stack>
            )}

            {/* Notes */}
            {record.notes && (
                <Text size="xs" c="dimmed" mt={6} style={{ fontStyle: "italic" }}>
                    {record.notes}
                </Text>
            )}

            {/* Badges */}
            <Group gap={6} mt={8} wrap="wrap">
                <Badge variant="light" size="xs" color="gray">
                    {record.biomarkers.length} parameters
                </Badge>
                {abnormalCount > 0 && (
                    <Badge variant="light" size="xs" color="yellow">
                        {abnormalCount} abnormal
                    </Badge>
                )}
                {criticalCount > 0 && (
                    <Badge variant="filled" size="xs" color="red">
                        {criticalCount} critical
                    </Badge>
                )}
            </Group>

            {/* Biomarkers expandable */}
            {record.biomarkers.length > 0 && (
                <>
                    <Divider mt="sm" />
                    <Text
                        size="xs"
                        fw={500}
                        c="primary"
                        style={{ cursor: "pointer" }}
                        mt="xs"
                        onClick={toggle}
                    >
                        {expanded ? "Hide" : "Show"} {record.biomarkers.length}{" "}
                        results {expanded ? "▲" : "▼"}
                    </Text>
                    <Collapse in={expanded}>
                        <Stack gap={0} mt="xs">
                            {record.biomarkers.map((b, i) => (
                                <BiomarkerRow key={`${b.name}-${i}`} b={b} />
                            ))}
                        </Stack>
                    </Collapse>
                </>
            )}

            <SourceModal
                record={record}
                opened={sourceOpen}
                onClose={closeSource}
            />
        </Card>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function LabReportsContent() {
    const { data: records = [], isLoading } = useLabReportsQuery();
    const upload = useUploadLabReportMutation();
    const deleteRecord = useDeleteLabReportMutation();
    const reExtract = useReExtractLabReportMutation();
    const resetRef = useRef<() => void>(null);

    function handleUpload(file: File | null) {
        if (!file) return;
        upload.mutate(file, {
            onSuccess: () => {
                resetRef.current?.();
                notifications.show({
                    message: "Lab report uploaded and analysed.",
                    color: colors.success,
                    icon: <IconCheck size={16} />,
                });
            },
            onError: (err) =>
                notifications.show({
                    title: "Upload failed",
                    message: err.message,
                    color: colors.danger,
                }),
        });
    }

    function handleDelete(record: LabReportRecord) {
        modals.openConfirmModal({
            title: "Delete lab report?",
            children: (
                <Text size="sm">
                    <strong>{record.testName}</strong> will be permanently
                    removed. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteRecord.mutate(record.id, {
                    onSuccess: () =>
                        notifications.show({
                            message: `${record.testName} deleted.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    function handleReExtract(record: LabReportRecord) {
        reExtract.mutate(record.id, {
            onSuccess: () =>
                notifications.show({
                    message: `${record.testName} re-analysed.`,
                    color: colors.success,
                    icon: <IconCheck size={16} />,
                }),
            onError: (err) =>
                notifications.show({
                    title: "Re-extraction failed",
                    message: err.message,
                    color: colors.danger,
                }),
        });
    }

    return (
        <Container pt="md">
            <Card radius="xl" withBorder>
                <Card.Section
                    bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))"
                    px="md"
                    py="md"
                    withBorder
                >
                    <Group justify="space-between" align="center">
                        <Group gap="sm">
                            <ThemeIcon
                                size={36}
                                radius="md"
                                color="primary"
                                variant="light"
                            >
                                <IconDroplet size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>
                                    Lab Reports
                                </Title>
                                <Text size="xs" c="dimmed">
                                    Upload and view your blood test results
                                </Text>
                            </Box>
                        </Group>
                        <Group gap="xs">
                            {!isLoading && records.length > 0 && (
                                <Badge
                                    variant="light"
                                    color="gray"
                                    size="sm"
                                    radius="xl"
                                >
                                    {records.length}{" "}
                                    {records.length === 1 ? "report" : "reports"}
                                </Badge>
                            )}
                            <FileButton
                                resetRef={resetRef}
                                onChange={handleUpload}
                                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            >
                                {(props) => (
                                    <Tooltip label="Upload lab report">
                                        <ActionIcon
                                            {...props}
                                            variant="light"
                                            color="primary"
                                            size="lg"
                                            radius="xl"
                                            loading={upload.isPending}
                                        >
                                            <IconUpload size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </FileButton>
                        </Group>
                    </Group>
                </Card.Section>
                <Card.Section p="md">
                    <ScrollArea style={{ height: "100%" }}>
                        <Box maw={800} mx="auto">
                            {isLoading && (
                                <Stack gap="md">
                                    {[1, 2, 3].map((k) => (
                                        <Skeleton key={k} height={120} radius="lg" />
                                    ))}
                                </Stack>
                            )}

                            {!isLoading && records.length === 0 && (
                                <Box py={60} style={{ textAlign: "center" }}>
                                    <ThemeIcon
                                        size={48}
                                        radius="xl"
                                        variant="light"
                                        color="gray"
                                        mx="auto"
                                        mb="md"
                                    >
                                        <IconDroplet size={24} />
                                    </ThemeIcon>
                                    <Text fw={500} size="lg">
                                        No lab reports yet
                                    </Text>
                                    <Text size="sm" c="dimmed" maw={320} mx="auto" mt={4}>
                                        Upload a blood test report (image, PDF, or
                                        Word doc) and AI will extract the results
                                        automatically.
                                    </Text>
                                </Box>
                            )}

                            {!isLoading && records.length > 0 && (
                                <Stack gap="md">
                                    {records.map((r) => (
                                        <LabReportCard
                                            key={r.id}
                                            record={r}
                                            onDelete={() => handleDelete(r)}
                                            onReExtract={() => handleReExtract(r)}
                                            isPendingDelete={
                                                deleteRecord.isPending &&
                                                deleteRecord.variables === r.id
                                            }
                                            isPendingReExtract={
                                                reExtract.isPending &&
                                                reExtract.variables === r.id
                                            }
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </ScrollArea>
                </Card.Section>
            </Card>
        </Container>
    );
}
