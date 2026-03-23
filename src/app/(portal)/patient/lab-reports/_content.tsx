"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Container,
    FileButton,
    Group,
    Pagination,
    RingProgress,
    SegmentedControl,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconCalendarEvent,
    IconCheck,
    IconDroplet,
    IconFlask,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconTrash,
    IconUpload,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
    useLabReportsQuery,
    useUploadLabReportMutation,
    useDeleteLabReportMutation,
    type LabReportRecord,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";
import { trackEvent } from "@/lib/analytics";

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
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
            }}
        >
            <Card.Section>
                <UnstyledButton
                    onClick={() => {
                        trackEvent({ name: "lab_report_viewed", params: { record_id: record.id } });
                        router.push(`/patient/lab-reports/${record.id}`);
                    }}
                    style={{ display: "block", width: "100%" }}
                    p="md"
                >
                    <Group gap="xs" align="center" wrap="nowrap">
                        <ThemeIcon size={28} radius="md" variant="light" color="primary" style={{ flexShrink: 0 }}>
                            <IconDroplet size={15} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={600} size="sm" truncate="end" lh={1.3}>
                                {record.testName}
                            </Text>
                        </Box>
                    </Group>
                    <Group gap={6} mt="xs" wrap="wrap">
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
                </UnstyledButton>
            </Card.Section>
            <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" withBorder px="sm">
                <Group justify="space-between">
                    <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                        <DateText date={record.testDate ?? record.createdAt} />
                    </Text>
                    <Group gap={2} py={6} justify="flex-end">
                        <Tooltip label="Delete" withArrow>
                            <ActionIcon
                                size={24}
                                variant="subtle"
                                color="red"
                                loading={isPendingDelete}
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                aria-label="Delete lab report"
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

// ── Main content ──────────────────────────────────────────────────────────────

export function LabReportsContent() {
    const { data: records = [], isLoading } = useLabReportsQuery();
    const upload = useUploadLabReportMutation();
    const deleteRecord = useDeleteLabReportMutation();
    const resetRef = useRef<() => void>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const [filterStatus, setFilterStatus] = useState<"all" | "normal" | "abnormal" | "critical">("all");
    const [sortField, setSortField] = useState<"date" | "name">("date");
    const [sortAsc, setSortAsc] = useState(false);

    const filtered = records.filter((r) => {
        if (filterStatus === "critical" && !r.biomarkers.some((b) => b.status === "critical")) return false;
        if (filterStatus === "abnormal" && !r.biomarkers.some((b) => b.status !== "normal")) return false;
        if (filterStatus === "normal" && r.biomarkers.some((b) => b.status !== "normal")) return false;
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
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
                    <Stack gap="sm">
                        <Group gap="sm">
                            <TextInput
                                placeholder="Search reports…"
                                leftSection={<IconSearch size={15} />}
                                size="sm"
                                value={search}
                                onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                                style={{ flex: 1 }}
                            />
                            <Box
                                component="button"
                                onClick={() => setSortAsc((p) => !p)}
                                style={{
                                    all: "unset",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: "var(--mantine-font-size-xs)",
                                    color: "var(--mantine-color-dimmed)",
                                }}
                            >
                                {sortAsc ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
                                {sortAsc ? "Oldest" : "Newest"}
                            </Box>
                        </Group>
                        <Group gap="sm" wrap="nowrap">
                            <SegmentedControl
                                size="xs"
                                value={filterStatus}
                                onChange={(v) => { setFilterStatus(v as typeof filterStatus); setPage(1); }}
                                data={[
                                    { value: "all", label: "All" },
                                    { value: "normal", label: "Normal" },
                                    { value: "abnormal", label: "Abnormal" },
                                    { value: "critical", label: "Critical" },
                                ]}
                            />
                            <SegmentedControl
                                size="xs"
                                value={sortField}
                                onChange={(v) => { setSortField(v as typeof sortField); setPage(1); }}
                                data={[
                                    { value: "date", label: "Date" },
                                    { value: "name", label: "Name" },
                                ]}
                            />
                        </Group>
                    </Stack>
                )}

                {/* ── Scrollable content ─────────────────────────── */}
                <Box>
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
                            <Text size="sm" c="dimmed" maw={320} mx="auto" mt={4}>
                                Upload a blood test report (image, PDF, or
                                Word doc) and AI will extract the results
                                automatically.
                            </Text>
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
