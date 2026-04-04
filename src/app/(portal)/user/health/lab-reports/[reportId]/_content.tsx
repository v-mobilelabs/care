"use client";
import { MotionCard } from "@/ui/components/motion-card";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Group,
    Image,
    Modal,
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
    IconArrowLeft,
    IconArrowUp,
    IconBuilding,
    IconCheck,
    IconCircleCheck,
    IconDownload,
    IconDroplet,
    IconEye,
    IconMessage,
    IconMapPin,
    IconRefresh,
    IconStethoscope,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
    useLabReportQuery,
    useDeleteLabReportMutation,
    useReExtractLabReportMutation,
    type BiomarkerStatus,
    type BiomarkerRecord,
    type LabReportRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";
import { trackEvent } from "@/lib/analytics";
import Link from "@/ui/link";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BiomarkerStatus, string> = {
    normal: colors.success,
    low: colors.warning,
    high: colors.warning,
    critical: colors.danger,
};

const STATUS_ICON: Record<BiomarkerStatus, ReactNode> = {
    normal: <IconCircleCheck size={14} />,
    low: <IconArrowDown size={14} />,
    high: <IconArrowUp size={14} />,
    critical: <IconAlertCircle size={14} />,
};

function getAbnormalCount(record: LabReportRecord): number {
    return record.biomarkers.filter((biomarker) => biomarker.status !== "normal").length;
}

function getCriticalCount(record: LabReportRecord): number {
    return record.biomarkers.filter((biomarker) => biomarker.status === "critical").length;
}

function getLabSourceExplanation(record: LabReportRecord): string {
    if (record.fileMimeType?.startsWith("image/")) {
        return "This report was interpreted from an uploaded image of your lab document. Compare key values with the original source if anything looks unclear.";
    }

    return "This report was interpreted from your uploaded lab file so you can review biomarkers in a structured format instead of scanning the raw document each time.";
}

function getLabInterpretation(record: LabReportRecord): string {
    const abnormalCount = getAbnormalCount(record);
    const criticalCount = getCriticalCount(record);

    if (criticalCount > 0) {
        return `${criticalCount} marker${criticalCount === 1 ? " is" : "s are"} flagged as critical. Prioritize clinician follow-up and do not rely on chat-only guidance for urgent concerns.`;
    }

    if (abnormalCount > 0) {
        return `${abnormalCount} marker${abnormalCount === 1 ? " is" : "s are"} outside the normal range. Review those markers first and discuss persistent symptoms with a clinician.`;
    }

    return "All extracted markers are currently within the normal range according to the report reference ranges.";
}

function getLabNextStep(record: LabReportRecord): string {
    const criticalCount = getCriticalCount(record);
    const abnormalCount = getAbnormalCount(record);

    if (criticalCount > 0) {
        return "Seek prompt clinical guidance, then use this report page to share the flagged markers quickly during follow-up.";
    }

    if (abnormalCount > 0) {
        return "Track any related symptoms and continue care follow-up with the abnormal markers as your discussion starting point.";
    }

    if (record.sessionId) {
        return "Continue the linked conversation to keep this report in context for future questions or trend checks.";
    }

    return "Keep this report as a baseline record and compare future test results against it over time.";
}

// ── Biomarker row ─────────────────────────────────────────────────────────────

function BiomarkerInfo({ b }: Readonly<{ b: BiomarkerRecord }>) {
    return (
        <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>{b.name}</Text>
            {b.referenceRange && <Text size="xs" c="dimmed">Ref: {b.referenceRange}</Text>}
        </Box>
    );
}

function BiomarkerValue({ b }: Readonly<{ b: BiomarkerRecord }>) {
    return (
        <Group gap={8} wrap="nowrap" align="center">
            <Text size="sm" fw={600} c={STATUS_COLOR[b.status]}>{b.value} {b.unit}</Text>
            <Badge size="xs" variant="light" color={STATUS_COLOR[b.status]} leftSection={STATUS_ICON[b.status]}>
                {b.status}
            </Badge>
        </Group>
    );
}

function BiomarkerRow({ b }: Readonly<{ b: BiomarkerRecord }>) {
    const bg = b.status === "critical"
        ? "light-dark(var(--mantine-color-red-0), rgba(255,0,0,0.06))" : undefined;
    return (
        <Group justify="space-between" gap="xs" py={6} px="sm" style={{ borderRadius: 8, background: bg }}>
            <BiomarkerInfo b={b} />
            <BiomarkerValue b={b} />
        </Group>
    );
}

// ── Source modal ──────────────────────────────────────────────────────────────

function SourcePreview({ fileUrl, testName, isImage }: Readonly<{ fileUrl: string; testName: string; isImage: boolean }>) {
    if (isImage) {
        return (
            <Image src={fileUrl} alt={testName} radius="md"
                style={{ maxHeight: "70vh", objectFit: "contain", width: "100%" }} />
        );
    }
    return (
        <Box component="iframe" src={fileUrl}
            style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} title={testName} />
    );
}

function SourceModal({ record, opened, onClose }: Readonly<{
    record: LabReportRecord; opened: boolean; onClose: () => void;
}>) {
    const fileUrl = record.fileUrl ?? `/api/files/${record.fileId}`;
    const isImage = record.fileMimeType?.startsWith("image/") ?? false;
    return (
        <Modal opened={opened} onClose={onClose} size="xl" centered radius="lg"
            title={<Text fw={600} size="sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} maw={320}>{record.testName} — Source</Text>}>
            <Stack gap="sm">
                <SourcePreview fileUrl={fileUrl} testName={record.testName} isImage={isImage} />
                <Group justify="flex-end">
                    <Button size="xs" variant="light" color="primary" component="a"
                        href={fileUrl} download leftSection={<IconDownload size={14} />}>Download</Button>
                </Group>
            </Stack>
        </Modal>
    );
}

// ── Detail sub-components ─────────────────────────────────────────────────────

function DetailSkeleton() {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <Group gap="sm" align="center">
                    <Skeleton circle h={32} w={32} />
                    <Skeleton h={22} w={220} radius="sm" />
                </Group>
                <DetailSkeletonCard />
            </Stack>
        </Container>
    );
}

function DetailSkeletonCard() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="md">
            <Stack gap="sm">
                <Stack gap={6}>
                    <Skeleton h={14} w="55%" />
                    <Skeleton h={14} w="40%" />
                    <Skeleton h={14} w="60%" />
                </Stack>
                <Group gap={6}>
                    <Skeleton h={22} w={110} radius="xl" />
                    <Skeleton h={22} w={110} radius="xl" />
                    <Skeleton h={22} w={100} radius="xl" />
                </Group>
                <Divider />
                <DetailSkeletonRows />
            </Stack>
        </MotionCard>
    );
}

function DetailSkeletonRows() {
    return (
        <Stack gap="xs">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={36} radius="sm" />)}
        </Stack>
    );
}

function ReportDetailMain({ record }: Readonly<{ record: LabReportRecord }>) {
    return (
        <>
            <LabMetadata record={record} />
            <ReportNotes notes={record.notes} />
            <SummaryBadges record={record} />
            <LabReportExplainer record={record} />
            <BiomarkersList biomarkers={record.biomarkers} />
        </>
    );
}

function LabReportExplainer({ record }: Readonly<{ record: LabReportRecord }>) {
    return (
        <Box
            p="sm"
            style={{
                background: "light-dark(var(--mantine-color-gray-0), rgba(255, 255, 255, 0.02))",
                borderRadius: 8,
                border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))"
            }}
        >
            <Stack gap="xs">
                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        What this means
                    </Text>
                    <Text size="sm">{getLabSourceExplanation(record)}</Text>
                </Box>

                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        How to interpret results
                    </Text>
                    <Text size="sm">{getLabInterpretation(record)}</Text>
                </Box>

                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Suggested next step
                    </Text>
                    <Text size="sm">{getLabNextStep(record)}</Text>
                </Box>

                {record.sessionId ? (
                    <Group>
                        <Link href={`/user/assistant?id=${record.sessionId}`}>
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                leftSection={<IconMessage size={14} />}
                                onClick={() => {
                                    trackEvent({
                                        name: "health_record_viewed",
                                        params: {
                                            action: "open_linked_session",
                                            surface: "lab_report_detail",
                                            session_id: record.sessionId,
                                            report_id: record.id,
                                        },
                                    });
                                }}
                            >
                                Open linked session
                            </Button>
                        </Link>
                    </Group>
                ) : null}
            </Stack>
        </Box>
    );
}

function ReportDetailCard({ record, onViewSource, onReExtract, onDelete, isReExtracting, isDeleting }: Readonly<{
    record: LabReportRecord;
    onViewSource: () => void;
    onReExtract: () => void;
    onDelete: () => void;
    isReExtracting: boolean;
    isDeleting: boolean;
}>) {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="md">
            <Stack gap="md">
                <ReportDetailMain record={record} />
                <ReportActions record={record} onViewSource={onViewSource} onReExtract={onReExtract}
                    onDelete={onDelete} isReExtracting={isReExtracting} isDeleting={isDeleting} />
            </Stack>
        </MotionCard>
    );
}

function NotFoundState({ onBack }: Readonly<{ onBack: () => void }>) {
    return (
        <Container pt="xl" pb="xl" size="md" style={{ textAlign: "center" }}>
            <ThemeIcon size={48} radius="xl" variant="light" color="gray" mx="auto" mb="md">
                <IconDroplet size={24} />
            </ThemeIcon>
            <Text fw={500}>Lab report not found</Text>
            <Button variant="light" mt="md" onClick={onBack}>Back to Lab Reports</Button>
        </Container>
    );
}

function ReportHeader({ record, onBack }: Readonly<{ record: LabReportRecord; onBack: () => void }>) {
    return (
        <Group gap="sm" align="center">
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={onBack} aria-label="Back">
                <IconArrowLeft size={18} />
            </ActionIcon>
            <ThemeIcon size={32} radius="md" variant="light" color="primary">
                <IconDroplet size={17} />
            </ThemeIcon>
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Title order={4} lh={1.2} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {record.testName}
                </Title>
                {record.testDate && <Text size="xs" c="dimmed"><DateText date={record.testDate} /></Text>}
            </Box>
        </Group>
    );
}

function MetaRow({ icon: Icon, text }: Readonly<{ icon: typeof IconBuilding; text: string }>) {
    return (
        <Group gap={8} wrap="nowrap">
            <Icon size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
            <Text size="sm">{text}</Text>
        </Group>
    );
}

function LabMetadata({ record }: Readonly<{ record: LabReportRecord }>) {
    if (!record.labName && !record.orderedBy && !record.labAddress) return null;
    return (
        <Box
            p="sm"
            bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
            style={{
                borderRadius: 8,
                border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))"
            }}
        >
            <Stack gap={6}>
                {record.labName && <MetaRow icon={IconBuilding} text={record.labName} />}
                {record.orderedBy && <MetaRow icon={IconStethoscope} text={`Dr. ${record.orderedBy}`} />}
                {record.labAddress && <MetaRow icon={IconMapPin} text={record.labAddress} />}
            </Stack>
        </Box>
    );
}

function SummaryBadges({ record }: Readonly<{ record: LabReportRecord }>) {
    const abnormal = record.biomarkers.filter((b) => b.status !== "normal").length;
    const critical = record.biomarkers.filter((b) => b.status === "critical").length;
    return (
        <Group gap={6}>
            <Badge variant="light" size="sm" color="gray">{record.biomarkers.length} parameters</Badge>
            {abnormal > 0 && <Badge variant="light" size="sm" color="yellow">{abnormal} abnormal</Badge>}
            {critical > 0 && <Badge variant="filled" size="sm" color="red">{critical} critical</Badge>}
        </Group>
    );
}

function BiomarkersList({ biomarkers }: Readonly<{ biomarkers: LabReportRecord["biomarkers"] }>) {
    if (!biomarkers.length) return null;
    return (
        <>
            <Divider label="Results" labelPosition="left" />
            <Stack gap={2}>
                {biomarkers.map((b, i) => <BiomarkerRow key={`${b.name}-${i}`} b={b} />)}
            </Stack>
        </>
    );
}

function ActionButtonGroup({ onViewSource, onReExtract, onDelete, isReExtracting, isDeleting }: Readonly<{
    onViewSource: () => void; onReExtract: () => void; onDelete: () => void;
    isReExtracting: boolean; isDeleting: boolean;
}>) {
    return (
        <Group gap="xs" wrap="wrap">
            <Tooltip label="View source document">
                <Button variant="light" color="gray" size="xs" leftSection={<IconEye size={14} />}
                    onClick={onViewSource}>View Source</Button>
            </Tooltip>
            <Tooltip label="Re-extract biomarkers with AI">
                <Button variant="light" color="primary" size="xs" leftSection={<IconRefresh size={14} />}
                    loading={isReExtracting} onClick={onReExtract}>Re-extract</Button>
            </Tooltip>
            <Button variant="light" color="red" size="xs" leftSection={<IconTrash size={14} />}
                loading={isDeleting} onClick={onDelete}>Delete</Button>
        </Group>
    );
}

function ReportActions({ record, onViewSource, onReExtract, onDelete, isReExtracting, isDeleting }: Readonly<{
    record: LabReportRecord; onViewSource: () => void; onReExtract: () => void; onDelete: () => void;
    isReExtracting: boolean; isDeleting: boolean;
}>) {
    return (
        <>
            <Divider />
            <Stack gap={6}>
                <ActionButtonGroup onViewSource={onViewSource} onReExtract={onReExtract} onDelete={onDelete}
                    isReExtracting={isReExtracting} isDeleting={isDeleting} />
                <Text size="xs" c="dimmed" ta="right">Added <DateText date={record.createdAt} /></Text>
            </Stack>
        </>
    );
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function onDeleteConfirm(deleteRecord: ReturnType<typeof useDeleteLabReportMutation>, record: LabReportRecord, goBack: () => void) {
    deleteRecord.mutate(record.id, {
        onSuccess: () => {
            trackEvent({ name: "lab_report_deleted", params: { record_id: record.id } });
            notifications.show({ message: `${record.testName} deleted.`, color: colors.success, icon: <IconCheck size={16} /> });
            goBack();
        },
        onError: (err) => notifications.show({ title: "Delete failed", message: err.message, color: colors.danger }),
    });
}

function useDeleteReportHandler(record: LabReportRecord | undefined | null, goBack: () => void) {
    const deleteRecord = useDeleteLabReportMutation();
    const handleDelete = () => {
        if (!record) return;
        modals.openConfirmModal({
            title: "Delete lab report?",
            children: <Text size="sm"><strong>{record.testName}</strong> will be permanently removed.</Text>,
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => onDeleteConfirm(deleteRecord, record, goBack),
        });
    };
    return { handleDelete, isDeleting: deleteRecord.isPending };
}

function useReExtractHandler(record: LabReportRecord | undefined | null) {
    const reExtract = useReExtractLabReportMutation();
    const handleReExtract = () => {
        if (!record) return;
        reExtract.mutate(record.id, {
            onSuccess: () => {
                trackEvent({ name: "lab_report_re_extracted", params: { record_id: record.id } });
                notifications.show({ message: `${record.testName} re-analysed.`, color: colors.success, icon: <IconCheck size={16} /> });
            },
            onError: (err) => notifications.show({ title: "Re-extraction failed", message: err.message, color: colors.danger }),
        });
    };
    return { handleReExtract, isReExtracting: reExtract.isPending };
}

// ── Detail content ────────────────────────────────────────────────────────────

function ReportNotes({ notes }: Readonly<{ notes?: string }>) {
    if (!notes) return null;
    return <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>{notes}</Text>;
}

function ReportDetail({ record, goBack, sourceOpen, openSource, closeSource, handleDelete, isDeleting, handleReExtract, isReExtracting }: Readonly<{
    record: LabReportRecord; goBack: () => void; sourceOpen: boolean; openSource: () => void; closeSource: () => void;
    handleDelete: () => void; isDeleting: boolean; handleReExtract: () => void; isReExtracting: boolean;
}>) {
    const onViewSource = () => { trackEvent({ name: "lab_report_viewed", params: { record_id: record.id } }); openSource(); };
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <ReportHeader record={record} onBack={goBack} />
                <ReportDetailCard record={record} onViewSource={onViewSource} onReExtract={handleReExtract}
                    onDelete={handleDelete} isReExtracting={isReExtracting} isDeleting={isDeleting} />
            </Stack>
            <SourceModal record={record} opened={sourceOpen} onClose={closeSource} />
        </Container>
    );
}

export function LabReportDetailContent({ reportId }: Readonly<{ reportId: string }>) {
    const router = useRouter();
    const { data: record, isLoading } = useLabReportQuery(reportId);
    const [sourceOpen, { open: openSource, close: closeSource }] = useDisclosure(false);
    const goBack = () => router.push("/user/health/lab-reports");
    const { handleDelete, isDeleting } = useDeleteReportHandler(record, goBack);
    const { handleReExtract, isReExtracting } = useReExtractHandler(record);

    if (isLoading) return <DetailSkeleton />;
    if (!record) return <NotFoundState onBack={goBack} />;

    return (
        <ReportDetail record={record} goBack={goBack} sourceOpen={sourceOpen} openSource={openSource}
            closeSource={closeSource} handleDelete={handleDelete} isDeleting={isDeleting}
            handleReExtract={handleReExtract} isReExtracting={isReExtracting} />
    );
}
