"use client";
import {
    ActionIcon,
    Autocomplete,
    Badge,
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    Group,
    Loader,
    Menu,
    Modal,
    NumberInput,
    Paper,
    ScrollArea,
    Select,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCapsule,
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconDotsVertical,
    IconEdit,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useMedicationsQuery,
    useAddMedicationMutation,
    useUpdateMedicationMutation,
    useDeleteMedicationMutation,
    useDrugSearchQuery,
    type MedicationRecord,
    type MedicationStatus,
    type AddMedicationPayload,
    type DrugRecord,
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

const STATUS_COLOR: Record<MedicationStatus, string> = {
    active: colors.success,
    completed: "blue",
    discontinued: "gray",
    paused: colors.warning,
};

const STATUS_LABEL: Record<MedicationStatus, string> = {
    active: "Active",
    completed: "Completed",
    discontinued: "Discontinued",
    paused: "Paused",
};

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

const FREQ_PRESETS = [
    "Once daily",
    "Twice daily",
    "Three times daily",
    "Every morning",
    "Every night",
    "As needed",
] as const;

const FORM_OPTIONS = [
    "Tablet", "Capsule", "Oral Solution", "Suspension",
    "Injection", "Topical", "Patch", "Inhaler", "Eye Drops", "Syrup",
];

/** Parses a stored duration string like "30 days", "2 weeks" back into parts. */
function parseDuration(raw: string | undefined): { amount: number | ""; unit: string } {
    if (!raw) return { amount: "", unit: "days" };
    const m = /^(\d+)\s*(days?|weeks?|months?)$/i.exec(raw.trim());
    if (!m) return { amount: "", unit: "days" };
    const unit = (() => {
        if (/^month/i.test(m[2])) return "months";
        if (/^week/i.test(m[2])) return "weeks";
        return "days";
    })();
    return { amount: Number.parseInt(m[1], 10), unit };
}

interface MedicationFormValues {
    name: string;
    dosage: string;
    form: string;
    instructions: string;
    condition: string;
    status: string;
}

export interface MedicationModalProps {
    opened: boolean;
    onClose: () => void;
    initial?: MedicationRecord;
}

export function MedicationModal({ opened, onClose, initial }: Readonly<MedicationModalProps>) {
    const addMutation = useAddMedicationMutation();
    const updateMutation = useUpdateMedicationMutation();
    const isEdit = !!initial;

    // ── Drug autocomplete state ──────────────────────────────────────────────
    const [nameQuery, setNameQuery] = useState(initial?.name ?? "");
    const [debouncedQuery] = useDebouncedValue(nameQuery, 350);
    const { data: drugResults = [], isFetching: drugsLoading } = useDrugSearchQuery(debouncedQuery);
    const [selectedDrug, setSelectedDrug] = useState<DrugRecord | null>(null);

    // ── Frequency state ──────────────────────────────────────────────────────
    const initFreq = initial?.frequency ?? "";
    const isPreset = FREQ_PRESETS.includes(initFreq as (typeof FREQ_PRESETS)[number]);
    const initFreqPreset = (() => {
        if (isPreset) return initFreq;
        if (initFreq) return "custom";
        return "";
    })();
    const [freqPreset, setFreqPreset] = useState<string>(initFreqPreset);
    const [freqCustom, setFreqCustom] = useState(isPreset ? "" : initFreq);

    // ── Duration state ───────────────────────────────────────────────────────
    const { amount: initAmount, unit: initUnit } = parseDuration(initial?.duration);
    const [durationAmount, setDurationAmount] = useState<number | "">(initAmount);
    const [durationUnit, setDurationUnit] = useState(initUnit);

    const form = useForm<MedicationFormValues>({
        initialValues: {
            name: initial?.name ?? "",
            dosage: initial?.dosage ?? "",
            form: initial?.form ?? "",
            instructions: initial?.instructions ?? "",
            condition: initial?.condition ?? "",
            status: initial?.status ?? "active",
        },
        validate: {
            name: (v) => v.trim().length < 1 ? "Medication name is required" : null,
        },
    });

    // Drug autocomplete options — display names
    const autocompleteData = drugResults.map((d) => d.name);

    // Dosage options come from the selected drug's strengths
    const dosageOptions = selectedDrug
        ? selectedDrug.strengths.map((s) => ({ value: s.label, label: s.label }))
        : [];

    function handleDrugSelect(name: string) {
        const drug = drugResults.find((d) => d.name === name) ?? null;
        setSelectedDrug(drug);
        form.setFieldValue("name", name);
        setNameQuery(name);
        if (drug) {
            // Auto-fill form field from drug data
            if (drug.defaultForm) form.setFieldValue("form", drug.defaultForm);
            // Clear dosage so user picks from the populated dropdown
            form.setFieldValue("dosage", "");
        }
    }

    function handleClose() {
        onClose();
        form.reset();
        setNameQuery(initial?.name ?? "");
        setSelectedDrug(null);
        const resetPreset = (() => {
            if (isPreset) return initFreq;
            if (initFreq) return "custom";
            return "";
        })();
        setFreqPreset(resetPreset);
        setFreqCustom(isPreset ? "" : initFreq);
        setDurationAmount(initAmount);
        setDurationUnit(initUnit);
    }

    function handleSubmit(values: MedicationFormValues) {
        const frequency = freqPreset === "custom"
            ? freqCustom.trim() || undefined
            : freqPreset || undefined;

        const duration = durationAmount === "" ? undefined : `${durationAmount} ${durationUnit}`;

        const payload: AddMedicationPayload = {
            name: values.name.trim(),
            dosage: values.dosage.trim() || undefined,
            form: values.form.trim() || undefined,
            frequency,
            duration,
            instructions: values.instructions.trim() || undefined,
            condition: values.condition.trim() || undefined,
            status: values.status as MedicationStatus,
        };

        if (isEdit && initial) {
            updateMutation.mutate(
                { medicationId: initial.id, ...payload },
                {
                    onSuccess: () => {
                        notifications.show({
                            title: "Medication updated",
                            message: `${values.name} has been updated.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        });
                        handleClose();
                    },
                },
            );
        } else {
            addMutation.mutate(payload, {
                onSuccess: () => {
                    notifications.show({
                        title: "Medication added",
                        message: `${values.name} has been saved to your medications.`,
                        color: colors.success,
                        icon: <IconCheck size={16} />,
                    });
                    handleClose();
                },
            });
        }
    }

    const isPending = addMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size={24} radius="md" color="violet" variant="light">
                        <IconCapsule size={13} />
                    </ThemeIcon>
                    <Text fw={600} size="sm">{isEdit ? "Edit Medication" : "Add Medication"}</Text>
                </Group>
            }
            size="md"
            radius="lg"
            centered
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">

                    {/* ── Name (autocomplete) ───────────────────────────── */}
                    <Autocomplete
                        label="Medication name"
                        placeholder="Search drug name…"
                        required
                        data={autocompleteData}
                        value={nameQuery}
                        onChange={(val) => {
                            setNameQuery(val);
                            form.setFieldValue("name", val);
                            // Clear drug selection if user edits manually
                            if (selectedDrug && val !== selectedDrug.name) setSelectedDrug(null);
                        }}
                        onOptionSubmit={handleDrugSelect}
                        rightSection={drugsLoading ? <Loader size={14} /> : null}
                        error={form.errors.name}
                        maxDropdownHeight={220}
                        comboboxProps={{ shadow: "md", radius: "md" }}
                    />

                    {/* ── Dosage + Form ─────────────────────────────────── */}
                    <Group gap="sm" grow>
                        {dosageOptions.length > 0 ? (
                            <Select
                                label="Dosage / Strength"
                                placeholder="Select strength"
                                data={dosageOptions}
                                clearable
                                {...form.getInputProps("dosage")}
                            />
                        ) : (
                            <TextInput
                                label="Dosage"
                                placeholder="e.g. 500 mg"
                                {...form.getInputProps("dosage")}
                            />
                        )}
                        <Select
                            label="Form"
                            placeholder="Select form"
                            data={FORM_OPTIONS}
                            clearable
                            {...form.getInputProps("form")}
                        />
                    </Group>

                    {/* ── Frequency (chip presets + optional custom) ────── */}
                    <Box>
                        <Text size="sm" fw={500} mb={8}>Frequency</Text>
                        <Chip.Group
                            multiple={false}
                            value={freqPreset}
                            onChange={setFreqPreset}
                        >
                            <Group gap={6} wrap="wrap">
                                {FREQ_PRESETS.map((p) => (
                                    <Chip key={p} value={p} size="sm" radius="md" variant="light" color="violet">
                                        {p}
                                    </Chip>
                                ))}
                                <Chip value="custom" size="sm" radius="md" variant="light" color="gray">
                                    Custom
                                </Chip>
                            </Group>
                        </Chip.Group>
                        {freqPreset === "custom" && (
                            <TextInput
                                mt="xs"
                                placeholder="e.g. every 8 hours, with meals"
                                value={freqCustom}
                                onChange={(e) => setFreqCustom(e.currentTarget.value)}
                            />
                        )}
                    </Box>

                    {/* ── Duration (number + unit + quick presets) ──────── */}
                    <Box>
                        <Text size="sm" fw={500} mb={8}>Duration</Text>
                        <Group gap="sm" align="flex-end">
                            <NumberInput
                                placeholder="Amount"
                                min={1}
                                max={999}
                                value={durationAmount}
                                onChange={(v) => setDurationAmount(v === "" ? "" : Number(v))}
                                style={{ flex: 1 }}
                                hideControls={false}
                                allowNegative={false}
                                allowDecimal={false}
                            />
                            <Select
                                data={[
                                    { value: "days", label: "Days" },
                                    { value: "weeks", label: "Weeks" },
                                    { value: "months", label: "Months" },
                                ]}
                                value={durationUnit}
                                onChange={(v) => setDurationUnit(v ?? "days")}
                                style={{ width: 110 }}
                            />
                        </Group>
                        <Group gap={6} mt={8} wrap="wrap">
                            {(
                                [
                                    { label: "7 days", amount: 7, unit: "days" },
                                    { label: "14 days", amount: 14, unit: "days" },
                                    { label: "1 month", amount: 1, unit: "months" },
                                    { label: "3 months", amount: 3, unit: "months" },
                                    { label: "6 months", amount: 6, unit: "months" },
                                ] as const
                            ).map(({ label, amount, unit }) => (
                                <Button
                                    key={label}
                                    size="compact-xs"
                                    variant={durationAmount === amount && durationUnit === unit ? "filled" : "default"}
                                    color={durationAmount === amount && durationUnit === unit ? "violet" : undefined}
                                    radius="xl"
                                    onClick={() => { setDurationAmount(amount); setDurationUnit(unit); }}
                                >
                                    {label}
                                </Button>
                            ))}
                        </Group>
                    </Box>

                    {/* ── Condition + Instructions ──────────────────────── */}
                    <TextInput
                        label="Condition it treats"
                        placeholder="e.g. Type 2 Diabetes"
                        {...form.getInputProps("condition")}
                    />
                    <TextInput
                        label="Instructions"
                        placeholder="e.g. Take with food"
                        {...form.getInputProps("instructions")}
                    />

                    {/* ── Status ────────────────────────────────────────── */}
                    <Select
                        label="Status"
                        data={[
                            { value: "active", label: "Active" },
                            { value: "paused", label: "Paused" },
                            { value: "completed", label: "Completed" },
                            { value: "discontinued", label: "Discontinued" },
                        ]}
                        {...form.getInputProps("status")}
                    />

                    <Group justify="flex-end" mt="xs">
                        <Button variant="default" onClick={handleClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" color="primary" loading={isPending}>
                            {isEdit ? "Save changes" : "Add medication"}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}

// ── Medication Card ───────────────────────────────────────────────────────────

function MedicationCard({ med, onEdit, isPendingDelete, onDelete }: Readonly<{
    med: MedicationRecord;
    onEdit: () => void;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const statusColor = STATUS_COLOR[med.status];
    const hasDetails = !!(med.dosage ?? med.form ?? med.frequency ?? med.duration ?? med.instructions ?? med.condition);

    const statusBorderColor = (() => {
        if (statusColor === colors.success) return "teal";
        if (statusColor === colors.warning) return "yellow";
        return statusColor;
    })();

    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                borderLeft: `3px solid var(--mantine-color-${statusBorderColor}-5)`,
            }}
        >
            <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                {/* Left: icon + name + badges */}
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color="violet"
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconCapsule size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" lineClamp={2}>{med.name}</Text>
                        <Group gap={6} mt={4} wrap="wrap">
                            <Badge size="xs" variant="light" color={statusColor} radius="sm">
                                {STATUS_LABEL[med.status]}
                            </Badge>
                            {med.dosage && (
                                <Text size="xs" c="dimmed">{med.dosage}</Text>
                            )}
                            {med.frequency && (
                                <Text size="xs" c="dimmed">· {med.frequency}</Text>
                            )}
                            {med.condition && (
                                <Badge size="xs" variant="outline" color="gray" radius="sm">
                                    {med.condition}
                                </Badge>
                            )}
                            <Text size="xs" c="dimmed">{formatDate(med.createdAt)}</Text>
                        </Group>
                    </Box>
                </Group>

                {/* Right: actions */}
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                    {hasDetails && (
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="gray"
                            onClick={toggle}
                            aria-label={expanded ? "Collapse" : "Expand"}
                        >
                            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        </ActionIcon>
                    )}
                    <Menu withinPortal position="bottom-end" shadow="md" radius="md">
                        <Menu.Target>
                            <ActionIcon size={28} variant="subtle" color="gray" aria-label="Options">
                                <IconDotsVertical size={14} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                                Edit
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={onDelete}
                                disabled={isPendingDelete}
                            >
                                Delete
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>

            {/* Expandable details */}
            {hasDetails && (
                <Collapse in={expanded}>
                    <Divider my="sm" />
                    <Stack gap={6}>
                        {[
                            { label: "Dosage", value: med.dosage },
                            { label: "Form", value: med.form },
                            { label: "Frequency", value: med.frequency },
                            { label: "Duration", value: med.duration },
                            { label: "For", value: med.condition },
                            { label: "Instructions", value: med.instructions },
                        ]
                            .filter((f) => !!f.value)
                            .map(({ label, value }) => (
                                <Group key={label} gap={8}>
                                    <Text size="xs" fw={600} c="dimmed" w={80} style={{ flexShrink: 0 }}>
                                        {label}
                                    </Text>
                                    <Text size="xs">{value}</Text>
                                </Group>
                            ))}
                    </Stack>
                </Collapse>
            )}
        </Paper>
    );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function MedicationSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={72} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: Readonly<{ onAdd: () => void }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="violet" variant="light" mx="auto" mb="md">
                <IconCapsule size={32} />
            </ThemeIcon>
            <Text fw={600} size="sm" mb={6}>No medications yet</Text>
            <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6} mb="lg">
                Add your current medications to keep track. The AI will also suggest saving medications it detects during your sessions.
            </Text>
            <Button
                leftSection={<IconPlus size={15} />}
                color="primary"
                variant="light"
                onClick={onAdd}
            >
                Add your first medication
            </Button>
        </Box>
    );
}

// ── Medications Content ───────────────────────────────────────────────────────

export function MedicationsContent() {
    const { data: medications = [], isLoading } = useMedicationsQuery();
    const deleteMutation = useDeleteMedicationMutation();
    const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
    const [editTarget, setEditTarget] = useState<MedicationRecord | null>(null);

    function handleDelete(id: string, name: string) {
        modals.openConfirmModal({
            title: "Remove medication?",
            children: (
                <Text size="sm">
                    <strong>{name}</strong> will be permanently removed from your medications list.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Medication removed",
                            message: `${name} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    // Group by active vs everything else
    const active = medications.filter((m) => m.status === "active" || m.status === "paused");
    const other = medications.filter((m) => m.status === "completed" || m.status === "discontinued");

    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* Add/Edit Modals */}
            <MedicationModal opened={addOpened} onClose={closeAdd} />
            {editTarget && (
                <MedicationModal
                    opened={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    initial={editTarget}
                />
            )}

            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="violet" variant="light">
                            <IconCapsule size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Medications</Title>
                            <Text size="xs" c="dimmed">
                                {medications.length > 0
                                    ? `${active.filter((m) => m.status === "active").length} active · ${medications.length} total`
                                    : "Manage your medication list"}
                            </Text>
                        </Box>
                    </Group>
                    <Button
                        leftSection={<IconPlus size={15} />}
                        size="sm"
                        color="primary"
                        variant="light"
                        onClick={openAdd}
                    >
                        <Text visibleFrom="xs" size="sm">Add</Text>
                        <Text hiddenFrom="xs" size="sm">Add</Text>
                    </Button>
                </Group>
            </Box>

            {/* Content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                        {isLoading && <MedicationSkeletons />}

                        {!isLoading && medications.length === 0 && (
                            <EmptyState onAdd={openAdd} />
                        )}

                        {!isLoading && medications.length > 0 && (
                            <Stack gap="xl">
                                {/* Active / Paused */}
                                {active.length > 0 && (
                                    <Box>
                                        <Text
                                            size="xs"
                                            fw={700}
                                            c="dimmed"
                                            mb="sm"
                                            style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}
                                        >
                                            Current
                                        </Text>
                                        <Stack gap="sm">
                                            {active.map((m) => (
                                                <MedicationCard
                                                    key={m.id}
                                                    med={m}
                                                    onEdit={() => setEditTarget(m)}
                                                    isPendingDelete={deleteMutation.isPending && deleteMutation.variables === m.id}
                                                    onDelete={() => handleDelete(m.id, m.name)}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {/* Completed / Discontinued */}
                                {other.length > 0 && (
                                    <Box>
                                        <Text
                                            size="xs"
                                            fw={700}
                                            c="dimmed"
                                            mb="sm"
                                            style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}
                                        >
                                            Past
                                        </Text>
                                        <Stack gap="sm">
                                            {other.map((m) => (
                                                <MedicationCard
                                                    key={m.id}
                                                    med={m}
                                                    onEdit={() => setEditTarget(m)}
                                                    isPendingDelete={deleteMutation.isPending && deleteMutation.variables === m.id}
                                                    onDelete={() => handleDelete(m.id, m.name)}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
