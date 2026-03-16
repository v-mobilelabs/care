"use client";
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Group,
    Loader,
    Modal,
    NumberInput,
    ScrollArea,
    Select,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCapsule, IconCheck } from "@tabler/icons-react";
import { useState } from "react";

import {
    useAddMedicationMutation,
    useUpdateMedicationMutation,
    useDrugSearchQuery,
    type MedicationRecord,
    type MedicationStatus,
    type AddMedicationPayload,
    type DrugRecord,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
