"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Container,
    FileButton,
    Group,
    Pagination,
    RingProgress,
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
    IconAlertCircle,
    IconCalendarEvent,
    IconCheck,
    IconDroplet,
    IconFlask,
    IconTrash,
    IconUpload,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { ListToolbar } from "@/ui/components/list-toolbar";
import {
    useLabReportsQuery,
    useUploadLabReportMutation,
    useDeleteLabReportMutation,
    type LabReportRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";
import { trackEvent } from "@/lib/analytics";
import Link from "@/ui/link";

const PAGE_SIZE = 10;

// ── Compact lab report card ───────────────────────────────────────────────────

function LabReportCard({
    record,
    onDelete,
    isPendingDelete,
}: Readonly<{
    record: LabReportRecord;
    onDelete: () => void;
    isPendingDelete: boolean;
}>) {
    const router = useRouter();
    const abnormalCount = record.biomarkers.filter((b) => b.status !== "normal").length;
    const criticalCount = record.biomarkers.filter((b) => b.status === "critical").length;

    return (
        <Card
            radius="md"
            p="xs"
            withBorder
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                cursor: "pointer",
            }}
            onClick={() => {
                trackEvent({ name: "lab_report_viewed", params: { record_id: record.id } });
                router.push(`/user/health/lab-reports/${record.id}`);
            }}
        >
            <Group wrap="nowrap" align="center" gap="sm">
                <ThemeIcon size={32} radius="md" variant="light" color="primary" style={{ flexShrink: 0 }}>
                    <IconDroplet size={18} />
                </ThemeIcon>

                <Box style={{ flex: 1, minWidth: 100 }}>
                    <Text fw={600} size="sm" truncate="end" lh={1.3}>
                        {record.testName}
                    </Text>
                    <Group gap={6} mt={2} wrap="nowrap">
                        <Text size="xs" c="dimmed" truncate="end">
                            {record.biomarkers.length} param{record.biomarkers.length !== 1 ? "s" : ""}
                        </Text>
                        {(abnormalCount > 0 || criticalCount > 0) && <Text size="xs" c="dimmed">&middot;</Text>}
                        {abnormalCount > 0 && <Text size="xs" c="yellow.7" fw={500}>{abnormalCount} abn</Text>}
                        {criticalCount > 0 && <Text size="xs" c="red.7" fw={500}>{criticalCount} crit</Text>}
                    </Group>
                </Box>

                <Group gap="xs" wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                        <DateText date={record.testDate ?? record.createdAt} />
                    </Text>

                    <Tooltip label="Delete" withArrow>
                        <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            loading={isPendingDelete}
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            aria-label="Delete lab report"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Card>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function LabReportsContent() {
    const { data: records = [], isLoading } = useLabReportsQuery();
    const upload = useUploadLabReportMutation();
    const deleteRecord = useDeleteLabReportMutation();
    const resetRef = useRef<() => void>(null);

    const {
        search,
        setSearch,
        filter: filterStatus,
        setFilter: setFilterStatus,
        sortField,
        setSortField,
        sortAsc,
        setSortAsc,
        page,
        setPage,
    } = useUrlFilters<"all" | "normal" | "abnormal" | "critical", "desc" | "asc", "date" | "name">({
        defaultFilter: "all",
        defaultSearch: "",
        defaultSortField: "date",
        defaultSort: "desc",
        defaultPage: 1,
    });

    const filtered = records.filter((r) => {
        if (filterStatus === "critical" && !r.biomarkers.some((b) => b.status === "critical")) return false;
        if (filterStatus === "abnormal" && !r.biomarkers.some((b) => b.status !== "normal")) return false;
        if (filterStatus === "normal" && r.biomarkers.some((b) => b.status !== "normal")) return false;
        if (search) {
            const q = search.toLowerCase();
            const searchable = [r.testName, r.labName ?? "", r.orderedBy ?? ""].join(" ").toLowerCase();
            if (!searchable.includes(q)) return false;
        }
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        const av = sortField === "name" ? a.testName : (a.testDate ?? a.createdAt);
        const bv = sortField === "name" ? b.testName : (b.testDate ?? b.createdAt);
        const cmp = av.localeCompare(bv);
        return sortAsc ? cmp : -cmp;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const stats = (() => {
        if (records.length === 0) return null;
        const allBiomarkers = records.flatMap((r) => r.biomarkers);
        const abnormal = allBiomarkers.filter((b) => b.status !== "normal").length;
        const critical = allBiomarkers.filter((b) => b.status === "critical").length;
        const normalPct = allBiomarkers.length > 0
            ? Math.round(((allBiomarkers.length - abnormal) / allBiomarkers.length) * 100)
            : 100;
        const sorted = [...records].sort((a, b) =>
            (b.testDate ?? b.createdAt).localeCompare(a.testDate ?? a.createdAt),
        );
        return { total: records.length, abnormal, critical, normalPct, lastDate: sorted[0]?.testDate ?? sorted[0]?.createdAt };
    })();

    function handleUpload(file: File | null) {
        if (!file) return;
        upload.mutate(file, {
            onSuccess: (data) => {
                resetRef.current?.();
                trackEvent({ name: "lab_report_uploaded", params: { record_id: data.id } });
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
                    onSuccess: () => {
                        trackEvent({ name: "lab_report_deleted", params: { record_id: record.id } });
                        notifications.show({
                            message: `${record.testName} deleted.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        });
                    },
                    onError: (err) =>
                        notifications.show({
                            title: "Delete failed",
                            message: err.message,
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    return (
        <Container pt="md">
            <Stack>
                {/* ── Header ──────────────────────────────────────── */}
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
                                Upload results, track biomarkers, and spot trends over time
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

                {/* ── Stats bar ────────────────────────────────────── */}
                {!isLoading && stats && (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                        <Group gap="xs" wrap="nowrap">
                            <RingProgress
                                size={40}
                                thickness={5}
                                roundCaps
                                sections={[{
                                    value: stats.normalPct, color: (() => {
                                        if (stats.normalPct >= 90) return colors.success;
                                        if (stats.normalPct >= 60) return colors.warning;
                                        return colors.danger;
                                    })()
                                }]}
                                label={
                                    <Text ta="center" fw={700} style={{ fontSize: 10 }} lh={1}>
                                        {stats.normalPct}%
                                    </Text>
                                }
                            />
                            <Box>
                                <Text size="xs" fw={600} lh={1.2}>Normal</Text>
                                <Text size="xs" c="dimmed" lh={1.2}>biomarkers</Text>
                            </Box>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            <ThemeIcon size={28} radius="md" variant="light" color="primary">
                                <IconFlask size={14} />
                            </ThemeIcon>
                            <Box>
                                <Text size="xs" fw={600} lh={1.2}>{stats.total} reports</Text>
                                <Text size="xs" c="dimmed" lh={1.2}>total</Text>
                            </Box>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            <ThemeIcon size={28} radius="md" variant="light" color={(() => {
                                if (stats.critical > 0) return colors.danger;
                                if (stats.abnormal > 0) return colors.warning;
                                return colors.success;
                            })()}>
                                <IconAlertCircle size={14} />
                            </ThemeIcon>
                            <Box>
                                <Text size="xs" fw={600} lh={1.2}>{stats.abnormal} abnormal</Text>
                                <Text size="xs" c="dimmed" lh={1.2}>{stats.critical} critical</Text>
                            </Box>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            <ThemeIcon size={28} radius="md" variant="light" color="gray">
                                <IconCalendarEvent size={14} />
                            </ThemeIcon>
                            <Box>
                                <Text size="xs" fw={600} lh={1.2}>Last test</Text>
                                <Text size="xs" c="dimmed" lh={1.2}>
                                    <DateText date={stats.lastDate} />
                                </Text>
                            </Box>
                        </Group>
                    </SimpleGrid>
                )}

                {/* ── Filter bar ───────────────────────────────────── */}
                {!isLoading && records.length > 0 && (
                    <ListToolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder="Search reports..."
                        filter={filterStatus}
                        onFilterChange={setFilterStatus}
                        filterData={[
                            { value: "all", label: "All" },
                            { value: "normal", label: "Normal" },
                            { value: "abnormal", label: "Abnormal" },
                            { value: "critical", label: "Critical" },
                        ]}
                        sortField={sortField}
                        onSortFieldChange={setSortField}
                        sortFieldData={[
                            { value: "date", label: "Date" },
                            { value: "name", label: "Name" },
                        ]}
                        sortAsc={sortAsc}
                        onSortAscChange={setSortAsc}
                    />
                )}

                {/* ── Scrollable content ─────────────────────────── */}
                <Box maw={1080} mx="auto" w="100%">
                    {isLoading && (
                        <Stack gap="md">
                            {[1, 2, 3].map((k) => (
                                <Skeleton key={k} height={120} radius="md" />
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
                            <Text size="sm" c="dimmed" maw={440} mx="auto" mt={4}>
                                Start building your results history here. Upload a blood test
                                report (image, PDF, or Word doc) and CareAI will extract key
                                biomarkers so you can review abnormalities and follow trends.
                            </Text>
                            <Group justify="center" mt="md" gap="sm">
                                <FileButton
                                    resetRef={resetRef}
                                    onChange={handleUpload}
                                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                >
                                    {(props) => (
                                        <Button
                                            {...props}
                                            variant="light"
                                            color="primary"
                                            leftSection={<IconUpload size={16} />}
                                            loading={upload.isPending}
                                        >
                                            Upload lab report
                                        </Button>
                                    )}
                                </FileButton>
                                <Button
                                    component={Link}
                                    href="/user/assistant"
                                    variant="subtle"
                                    color="gray"
                                >
                                    Ask assistant first
                                </Button>
                            </Group>
                        </Box>
                    )}

                    {!isLoading && records.length > 0 && sorted.length === 0 && (
                        <Text ta="center" c="dimmed" py="xl">No reports match your search or filter.</Text>
                    )}

                    {!isLoading && sorted.length > 0 && (
                        <Stack gap="md">
                            {paginated.map((r) => (
                                <LabReportCard
                                    key={r.id}
                                    record={r}
                                    onDelete={() => handleDelete(r)}
                                    isPendingDelete={
                                        deleteRecord.isPending &&
                                        deleteRecord.variables === r.id
                                    }
                                />
                            ))}
                            {totalPages > 1 && (
                                <Group justify="center" mt="md">
                                    <Pagination
                                        size="sm"
                                        total={totalPages}
                                        value={safePage}
                                        onChange={setPage}
                                    />
                                </Group>
                            )}
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Container>
    );
}
