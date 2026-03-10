"use client";
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Container,
    Divider,
    Drawer,
    Group,
    Image,
    Menu,
    NumberInput,
    Paper,
    ScrollArea,
    Select,
    Skeleton,
    Stack,
    Text,
    TextInput,
    Textarea,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconAlertTriangle,
    IconCheck,
    IconDotsVertical,
    IconEdit,
    IconExternalLink,
    IconFileTypePdf,
    IconInfoCircle,
    IconPhoto,
    IconShield,
    IconTrash,
    IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

import {
    useInsuranceQuery,
    useAddInsuranceMutation,
    useUpdateInsuranceMutation,
    useDeleteInsuranceMutation,
    useExtractInsuranceMutation,
    type InsuranceRecord,
    type InsuranceType,
    type AddInsurancePayload,
    type UpdateInsurancePayload,
    type InsuranceExtractResponse,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fmtMoney(amount: number): string {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
}

const TYPE_COLOR: Record<InsuranceType, string> = {
    health: colors.success,
    dental: "blue",
    vision: "cyan",
    life: "violet",
    disability: colors.warning,
    other: "gray",
};

const TYPE_LABEL: Record<InsuranceType, string> = {
    health: "Health",
    dental: "Dental",
    vision: "Vision",
    life: "Life",
    disability: "Disability",
    other: "Other",
};

const TYPE_OPTIONS = [
    { value: "health", label: "Health" },
    { value: "dental", label: "Dental" },
    { value: "vision", label: "Vision" },
    { value: "life", label: "Life" },
    { value: "disability", label: "Disability" },
    { value: "other", label: "Other" },
];

// ── Form values ───────────────────────────────────────────────────────────────

interface FormValues {
    providerName: string;
    policyNumber: string;
    groupNumber: string;
    planName: string;
    type: InsuranceType;
    subscriberName: string;
    memberId: string;
    effectiveDate: string;
    expirationDate: string;
    copay: number | "";
    deductible: number | "";
    outOfPocketMax: number | "";
    notes: string;
}

const EMPTY_FORM: FormValues = {
    providerName: "",
    policyNumber: "",
    groupNumber: "",
    planName: "",
    type: "health",
    subscriberName: "",
    memberId: "",
    effectiveDate: "",
    expirationDate: "",
    copay: "",
    deductible: "",
    outOfPocketMax: "",
    notes: "",
};

function extractToForm(ex: InsuranceExtractResponse["extracted"]): FormValues {
    return {
        providerName: ex.providerName ?? "",
        policyNumber: ex.policyNumber ?? "",
        groupNumber: ex.groupNumber ?? "",
        planName: ex.planName ?? "",
        type: (ex.type as InsuranceType) ?? "health",
        subscriberName: ex.subscriberName ?? "",
        memberId: ex.memberId ?? "",
        effectiveDate: ex.effectiveDate ?? "",
        expirationDate: ex.expirationDate ?? "",
        copay: ex.copay ?? "",
        deductible: ex.deductible ?? "",
        outOfPocketMax: ex.outOfPocketMax ?? "",
        notes: "",
    };
}

function recordToForm(r: InsuranceRecord): FormValues {
    return {
        providerName: r.providerName,
        policyNumber: r.policyNumber,
        groupNumber: r.groupNumber ?? "",
        planName: r.planName ?? "",
        type: r.type,
        subscriberName: r.subscriberName ?? "",
        memberId: r.memberId ?? "",
        effectiveDate: r.effectiveDate ?? "",
        expirationDate: r.expirationDate ?? "",
        copay: r.copay ?? "",
        deductible: r.deductible ?? "",
        outOfPocketMax: r.outOfPocketMax ?? "",
        notes: r.notes ?? "",
    };
}

// ── Shared form fields ────────────────────────────────────────────────────────

function InsuranceFormFields({ form }: Readonly<{ form: ReturnType<typeof useForm<FormValues>> }>) {
    return (
        <Stack gap="sm">
            <Select
                label="Insurance Type"
                data={TYPE_OPTIONS}
                {...form.getInputProps("type")}
                required
            />
            <TextInput
                label="Provider / Company Name"
                placeholder="e.g. Blue Cross Blue Shield"
                required
                {...form.getInputProps("providerName")}
            />
            <TextInput
                label="Plan Name"
                placeholder="e.g. Gold PPO 1000"
                {...form.getInputProps("planName")}
            />
            <Group grow>
                <TextInput
                    label="Policy Number"
                    placeholder="e.g. XYZ123456"
                    required
                    {...form.getInputProps("policyNumber")}
                />
                <TextInput
                    label="Group Number"
                    placeholder="e.g. 987654"
                    {...form.getInputProps("groupNumber")}
                />
            </Group>
            <Group grow>
                <TextInput
                    label="Member ID"
                    placeholder="e.g. MBR00012345"
                    {...form.getInputProps("memberId")}
                />
                <TextInput
                    label="Subscriber Name"
                    placeholder="Primary insured person"
                    {...form.getInputProps("subscriberName")}
                />
            </Group>
            <Group grow>
                <TextInput
                    label="Effective Date"
                    placeholder="YYYY-MM-DD"
                    {...form.getInputProps("effectiveDate")}
                />
                <TextInput
                    label="Expiration Date"
                    placeholder="YYYY-MM-DD"
                    {...form.getInputProps("expirationDate")}
                />
            </Group>
            <Divider label="Coverage Details (optional)" labelPosition="center" />
            <Group grow>
                <NumberInput
                    label="Copay ($)"
                    placeholder="e.g. 30"
                    min={0}
                    prefix="$"
                    {...form.getInputProps("copay")}
                />
                <NumberInput
                    label="Annual Deductible ($)"
                    placeholder="e.g. 1500"
                    min={0}
                    prefix="$"
                    {...form.getInputProps("deductible")}
                />
                <NumberInput
                    label="Out-of-Pocket Max ($)"
                    placeholder="e.g. 5000"
                    min={0}
                    prefix="$"
                    {...form.getInputProps("outOfPocketMax")}
                />
            </Group>
            <Textarea
                label="Notes"
                placeholder="Any additional information..."
                rows={3}
                {...form.getInputProps("notes")}
            />
        </Stack>
    );
}

// ── Review Drawer (shown after AI extraction) ─────────────────────────────────

function ReviewDrawer({
    extractResult,
    onClose,
}: Readonly<{
    extractResult: InsuranceExtractResponse | null;
    onClose: () => void;
}>) {
    const addMutation = useAddInsuranceMutation();

    const form = useForm<FormValues>({
        initialValues: extractResult
            ? extractToForm(extractResult.extracted)
            : EMPTY_FORM,
        validate: {
            providerName: (v) => (v.trim() ? null : "Provider name is required"),
            policyNumber: (v) => (v.trim() ? null : "Policy number is required"),
        },
    });

    function handleSubmit(values: FormValues) {
        const payload: AddInsurancePayload = {
            providerName: values.providerName.trim(),
            policyNumber: values.policyNumber.trim(),
            groupNumber: values.groupNumber.trim() || undefined,
            planName: values.planName.trim() || undefined,
            type: values.type,
            subscriberName: values.subscriberName.trim() || undefined,
            memberId: values.memberId.trim() || undefined,
            effectiveDate: values.effectiveDate.trim() || undefined,
            expirationDate: values.expirationDate.trim() || undefined,
            copay: values.copay !== "" ? Number(values.copay) : undefined,
            deductible: values.deductible !== "" ? Number(values.deductible) : undefined,
            outOfPocketMax: values.outOfPocketMax !== "" ? Number(values.outOfPocketMax) : undefined,
            notes: values.notes.trim() || undefined,
            documentStoragePath: extractResult?.storagePath,
            documentUrl: extractResult?.documentUrl,
        };

        addMutation.mutate(payload, {
            onSuccess: () => {
                notifications.show({
                    title: "Insurance saved",
                    message: `${payload.providerName} has been added.`,
                    color: colors.success,
                    icon: <IconCheck size={18} />,
                });
                onClose();
            },
        });
    }

    const isPdf = extractResult?.storagePath?.match(/\.pdf$/i);

    return (
        <Drawer
            opened={extractResult !== null}
            onClose={onClose}
            title={<Text fw={700} size="lg">Review Extracted Details</Text>}
            position="right"
            size="lg"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Stack gap="md">
                {/* Document preview */}
                {extractResult?.documentUrl && (
                    <Paper withBorder radius="md" p="sm" style={{ textAlign: "center" }}>
                        {isPdf
                            ? (
                                <Group justify="center" gap="xs" py="sm">
                                    <IconFileTypePdf size={32} color="var(--mantine-color-red-6)" />
                                    <Text size="sm" c="dimmed">PDF document uploaded</Text>
                                </Group>
                            )
                            : (
                                <Image
                                    src={extractResult.documentUrl}
                                    alt="Insurance card"
                                    radius="sm"
                                    mah={220}
                                    fit="contain"
                                />
                            )}
                    </Paper>
                )}

                {/* Extraction status */}
                {extractResult?.extractionError
                    ? (
                        <Alert
                            icon={<IconAlertTriangle size={16} />}
                            color="orange"
                            title="Extraction had issues"
                        >
                            {extractResult.extractionError} — please fill in the fields manually.
                        </Alert>
                    )
                    : (
                        <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Review extracted info">
                            We extracted the details below from your document. Verify and correct anything before saving.
                        </Alert>
                    )}

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="sm">
                        <InsuranceFormFields form={form} />
                        <Group justify="flex-end" mt="xs">
                            <Button variant="subtle" color="gray" onClick={onClose} disabled={addMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={addMutation.isPending}>
                                Save Insurance
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Stack>
        </Drawer>
    );
}

// ── Edit Drawer ───────────────────────────────────────────────────────────────

function EditDrawer({
    record,
    onClose,
}: Readonly<{
    record: InsuranceRecord | null;
    onClose: () => void;
}>) {
    const updateMutation = useUpdateInsuranceMutation();

    const form = useForm<FormValues>({
        initialValues: record ? recordToForm(record) : EMPTY_FORM,
        validate: {
            providerName: (v) => (v.trim() ? null : "Provider name is required"),
            policyNumber: (v) => (v.trim() ? null : "Policy number is required"),
        },
    });

    function handleSubmit(values: FormValues) {
        if (!record) return;
        const payload: UpdateInsurancePayload = {
            insuranceId: record.id,
            providerName: values.providerName.trim(),
            policyNumber: values.policyNumber.trim(),
            groupNumber: values.groupNumber.trim() || undefined,
            planName: values.planName.trim() || undefined,
            type: values.type,
            subscriberName: values.subscriberName.trim() || undefined,
            memberId: values.memberId.trim() || undefined,
            effectiveDate: values.effectiveDate.trim() || undefined,
            expirationDate: values.expirationDate.trim() || undefined,
            copay: values.copay !== "" ? Number(values.copay) : undefined,
            deductible: values.deductible !== "" ? Number(values.deductible) : undefined,
            outOfPocketMax: values.outOfPocketMax !== "" ? Number(values.outOfPocketMax) : undefined,
            notes: values.notes.trim() || undefined,
        };

        updateMutation.mutate(payload, {
            onSuccess: () => {
                notifications.show({
                    title: "Insurance updated",
                    message: `${payload.providerName} has been updated.`,
                    color: colors.success,
                    icon: <IconCheck size={18} />,
                });
                onClose();
            },
        });
    }

    return (
        <Drawer
            opened={record !== null}
            onClose={onClose}
            title={<Text fw={700} size="lg">Edit Insurance</Text>}
            position="right"
            size="lg"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="sm">
                    <InsuranceFormFields form={form} />
                    <Group justify="flex-end" mt="xs">
                        <Button variant="subtle" color="gray" onClick={onClose} disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={updateMutation.isPending}>
                            Save Changes
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Drawer>
    );
}

// ── Insurance Card ────────────────────────────────────────────────────────────

function InsuranceCard({
    record,
    onEdit,
    onDelete,
}: Readonly<{
    record: InsuranceRecord;
    onEdit: () => void;
    onDelete: () => void;
}>) {
    const color = TYPE_COLOR[record.type];
    const isExpired = record.expirationDate
        ? new Date(record.expirationDate) < new Date()
        : false;

    return (
        <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" mb="xs" wrap="nowrap" align="flex-start">
                <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <ThemeIcon size={42} radius="md" color={color} variant="light">
                        <IconShield size={22} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={700} size="md" style={{ lineHeight: 1.3 }} lineClamp={1}>
                            {record.providerName}
                        </Text>
                        {record.planName && (
                            <Text size="sm" c="dimmed" lineClamp={1}>
                                {record.planName}
                            </Text>
                        )}
                    </Box>
                </Group>
                <Group gap={6} wrap="nowrap">
                    <Badge color={color} variant="light" size="sm">
                        {TYPE_LABEL[record.type]}
                    </Badge>
                    {isExpired && (
                        <Badge color="red" variant="light" size="sm">
                            Expired
                        </Badge>
                    )}
                    <Menu withinPortal position="bottom-end">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={15} />} onClick={onEdit}>
                                Edit
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<IconTrash size={15} />}
                                color="red"
                                onClick={onDelete}
                            >
                                Delete
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>

            <Stack gap={4} mt="xs">
                <Group gap="xs">
                    <Text size="xs" c="dimmed" style={{ minWidth: 110 }}>Policy #</Text>
                    <Text size="xs" fw={600}>{record.policyNumber}</Text>
                </Group>
                {record.groupNumber && (
                    <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 110 }}>Group #</Text>
                        <Text size="xs" fw={600}>{record.groupNumber}</Text>
                    </Group>
                )}
                {record.memberId && (
                    <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 110 }}>Member ID</Text>
                        <Text size="xs" fw={600}>{record.memberId}</Text>
                    </Group>
                )}
                {record.subscriberName && (
                    <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 110 }}>Subscriber</Text>
                        <Text size="xs" fw={600}>{record.subscriberName}</Text>
                    </Group>
                )}
                {(record.effectiveDate || record.expirationDate) && (
                    <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 110 }}>Coverage</Text>
                        <Text size="xs" fw={600}>
                            {record.effectiveDate ? formatDate(record.effectiveDate) : "—"}
                            {" → "}
                            {record.expirationDate ? formatDate(record.expirationDate) : "ongoing"}
                        </Text>
                    </Group>
                )}
            </Stack>

            {(record.copay !== undefined || record.deductible !== undefined || record.outOfPocketMax !== undefined) && (
                <>
                    <Divider my="sm" />
                    <Group gap="xl">
                        {record.copay !== undefined && (
                            <Box>
                                <Text size="xs" c="dimmed">Copay</Text>
                                <Text size="sm" fw={700}>{fmtMoney(record.copay)}</Text>
                            </Box>
                        )}
                        {record.deductible !== undefined && (
                            <Box>
                                <Text size="xs" c="dimmed">Deductible</Text>
                                <Text size="sm" fw={700}>{fmtMoney(record.deductible)}</Text>
                            </Box>
                        )}
                        {record.outOfPocketMax !== undefined && (
                            <Box>
                                <Text size="xs" c="dimmed">Out-of-Pocket Max</Text>
                                <Text size="sm" fw={700}>{fmtMoney(record.outOfPocketMax)}</Text>
                            </Box>
                        )}
                    </Group>
                </>
            )}

            {record.notes && (
                <>
                    <Divider my="sm" />
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>{record.notes}</Text>
                </>
            )}

            {record.documentUrl && (
                <>
                    <Divider my="sm" />
                    <Group gap="xs">
                        {record.documentStoragePath?.match(/\.pdf$/i)
                            ? <IconFileTypePdf size={18} color="var(--mantine-color-red-6)" />
                            : <IconPhoto size={18} color="var(--mantine-color-blue-6)" />}
                        <Tooltip label="Open document" withinPortal>
                            <Text
                                size="xs"
                                fw={600}
                                component="a"
                                href={record.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 4 }}
                            >
                                View document <IconExternalLink size={12} />
                            </Text>
                        </Tooltip>
                    </Group>
                </>
            )}
        </Paper>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onUpload }: Readonly<{ onUpload: () => void }>) {
    return (
        <Paper withBorder radius="lg" p="xl" style={{ textAlign: "center" }}>
            <ThemeIcon size={56} radius="xl" color="primary" variant="light" mx="auto" mb="sm">
                <IconShield size={28} />
            </ThemeIcon>
            <Text fw={600} size="lg" mb={4}>No insurance records yet</Text>
            <Text size="sm" c="dimmed" mb="lg">
                Upload a photo or scan of your insurance card and we'll extract the details automatically.
            </Text>
            <Button leftSection={<IconUpload size={16} />} onClick={onUpload}>
                Upload Insurance Card
            </Button>
        </Paper>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function InsuranceContent() {
    const { data: records = [], isLoading } = useInsuranceQuery();
    const deleteMutation = useDeleteInsuranceMutation();
    const extractMutation = useExtractInsuranceMutation();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [reviewResult, setReviewResult] = useState<InsuranceExtractResponse | null>(null);
    const [editingRecord, setEditingRecord] = useState<InsuranceRecord | null>(null);

    function handleUploadClick() {
        fileInputRef.current?.click();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";

        extractMutation.mutate(file, {
            onSuccess: (result) => {
                setReviewResult(result);
            },
            onError: (err) => {
                notifications.show({
                    title: "Upload failed",
                    message: err.message,
                    color: "red",
                });
            },
        });
    }

    function handleDelete(record: InsuranceRecord) {
        modals.openConfirmModal({
            title: "Delete insurance?",
            children: (
                <Text size="sm">
                    This will permanently remove <strong>{record.providerName}</strong> and any
                    uploaded document. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(record.id, {
                    onSuccess: () => {
                        notifications.show({
                            title: "Insurance deleted",
                            message: `${record.providerName} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        });
                    },
                });
            },
        });
    }

    return (
        <Container pt="md">
            <ReviewDrawer
                key={reviewResult?.storagePath ?? "review"}
                extractResult={reviewResult}
                onClose={() => setReviewResult(null)}
            />
            <EditDrawer
                key={editingRecord?.id ?? "edit"}
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
            />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            <Card radius="xl" shadow="xl">
                <Card.Section px="xl" py="lg" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap={12} wrap="nowrap">
                            <ThemeIcon size={40} radius="md" color="primary" variant="light">
                                <IconShield size={22} />
                            </ThemeIcon>
                            <Box>
                                <Title order={3} style={{ lineHeight: 1.2 }}>Insurance</Title>
                                <Text size="xs" c="dimmed">
                                    Upload a card to extract details, or review saved coverage.
                                </Text>
                            </Box>
                        </Group>
                        {/* Mobile: Icon-only button */}
                        <Tooltip label=\"Upload Insurance Card\" withArrow hiddenFrom=\"sm\">
                        <ActionIcon
                            size={32}
                            variant=\"filled\"
                        color=\"primary\"
                        onClick={handleUploadClick}
                        loading={extractMutation.isPending}
                        hiddenFrom=\"sm\"
                        aria-label=\"Upload Insurance Card\"
                        >
                        <IconUpload size={16} />
                    </ActionIcon>
                </Tooltip>
                {/* Desktop: Full button */}
                <Button
                    leftSection={<IconUpload size={16} />}
                    onClick={handleUploadClick}
                    loading={extractMutation.isPending}
                    visibleFrom=\"sm\"
                    >
                {extractMutation.isPending ? "Extracting…" : "Upload Card"}
            </Button>
        </Group>
                </Card.Section >
        <Card.Section p="md">
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box maw={840} mx="auto">
                        {(() => {
                            if (extractMutation.isPending) {
                                return (
                                    <Stack gap="md">
                                        {["sk-a", "sk-b"].map((k) => (
                                            <Skeleton key={k} height={180} radius="lg" />
                                        ))}
                                    </Stack>
                                );
                            }

                            if (isLoading) {
                                return (
                                    <Stack gap="md">
                                        {["sk-c", "sk-d"].map((k) => (
                                            <Skeleton key={k} height={180} radius="lg" />
                                        ))}
                                    </Stack>
                                );
                            }

                            if (records.length === 0) {
                                return <EmptyState onUpload={handleUploadClick} />;
                            }

                            return (
                                <Stack gap="md" maw={840} mx="auto">
                                    {records.map((record) => (
                                        <InsuranceCard
                                            key={record.id}
                                            record={record}
                                            onEdit={() => setEditingRecord(record)}
                                            onDelete={() => handleDelete(record)}
                                        />
                                    ))}
                                </Stack>
                            );
                        })()}
                    </Box>
                </ScrollArea>
            </Box>
        </Card.Section>
            </Card >
        </Container >
    );
}
