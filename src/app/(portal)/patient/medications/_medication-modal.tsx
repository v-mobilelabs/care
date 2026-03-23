"use client";
import {
    Box,
    Button,
    Chip,
    Group,
    Modal,
    ScrollArea,
    Stack,
    Switch,
    Text,
    TextInput,
    ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
    IconCapsule,
    IconCheck,
    IconClock,
    IconDroplet,
    IconEye,
    IconFlask,
    IconMedicineSyrup,
    IconNeedle,
    IconPill,
    IconPillFilled,
    IconSpray,
    IconSticker,
    IconWind,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useAddMedicationMutation,
    useUpdateMedicationMutation,
    type MedicationRecord,
    type MedicationStatus,
    type AddMedicationPayload,
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

const FORM_OPTIONS: ReadonlyArray<{ value: string; label: string; icon: React.ReactNode }> = [
    { value: "Tablet", label: "Tablet", icon: <IconPill size={14} /> },
    { value: "Capsule", label: "Capsule", icon: <IconPillFilled size={14} /> },
    { value: "Syrup", label: "Syrup", icon: <IconMedicineSyrup size={14} /> },
    { value: "Oral Solution", label: "Solution", icon: <IconFlask size={14} /> },
    { value: "Suspension", label: "Suspension", icon: <IconDroplet size={14} /> },
    { value: "Injection", label: "Injection", icon: <IconNeedle size={14} /> },
    { value: "Topical", label: "Topical", icon: <IconSticker size={14} /> },
    { value: "Patch", label: "Patch", icon: <IconSticker size={14} /> },
    { value: "Inhaler", label: "Inhaler", icon: <IconWind size={14} /> },
    { value: "Eye Drops", label: "Eye Drops", icon: <IconEye size={14} /> },
    { value: "Spray", label: "Spray", icon: <IconSpray size={14} /> },
];

interface MedicationFormValues {
    name: string;
    dosage: string;
    form: string;
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

    const form = useForm<MedicationFormValues>({
        initialValues: {
            name: initial?.name ?? "",
            dosage: initial?.dosage ?? "",
            form: initial?.form ?? "",
            status: initial?.status ?? "active",
        },
        validate: {
            name: (v) => v.trim().length < 1 ? "Medication name is required" : null,
        },
    });

    function handleClose() {
        onClose();
        form.reset();
        const resetPreset = (() => {
            if (isPreset) return initFreq;
            if (initFreq) return "custom";
            return "";
        })();
        setFreqPreset(resetPreset);
        setFreqCustom(isPreset ? "" : initFreq);
    }

    function handleSubmit(values: MedicationFormValues) {
        const frequency = freqPreset === "custom"
            ? freqCustom.trim() || undefined
            : freqPreset || undefined;

        const payload: AddMedicationPayload = {
            name: values.name.trim(),
            dosage: values.dosage.trim() || undefined,
            form: values.form.trim() || undefined,
            frequency,
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

                    {/* ── Name ─────────────────────────────────────────── */}
                    <TextInput
                        label="Medication name"
                        placeholder="Enter medication name"
                        size="sm"
                        required
                        leftSection={<IconPill size={16} />}
                        {...form.getInputProps("name")}
                    />

                    {/* ── Dosage ────────────────────────────────────────── */}
                    <TextInput
                        label="Dosage"
                        placeholder="e.g. 500 mg"
                        size="sm"
                        leftSection={<IconDroplet size={16} />}
                        {...form.getInputProps("dosage")}
                    />

                    {/* ── Form (chip-based) ─────────────────────────────── */}
                    <Box>
                        <Text size="sm" fw={500} mb={8}>Form</Text>
                        <Chip.Group
                            multiple={false}
                            value={form.values.form}
                            onChange={(v) => form.setFieldValue("form", v as string)}
                        >
                            <Group gap={6} wrap="wrap">
                                {FORM_OPTIONS.map((f) => (
                                    <Chip
                                        key={f.value}
                                        value={f.value}
                                        size="sm"
                                        radius="md"
                                        variant="light"
                                        color="violet"
                                    >
                                        {f.label}
                                    </Chip>
                                ))}
                            </Group>
                        </Chip.Group>
                    </Box>

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
                                size="sm"
                                placeholder="e.g. every 8 hours, with meals"
                                leftSection={<IconClock size={16} />}
                                value={freqCustom}
                                onChange={(e) => setFreqCustom(e.currentTarget.value)}
                            />
                        )}
                    </Box>

                    {/* ── Status ────────────────────────────────────────── */}
                    {(form.values.status === "active" || form.values.status === "paused") && (
                        <Group justify="space-between">
                            <Text size="sm" fw={500}>Active</Text>
                            <Switch
                                size="md"
                                color={colors.success}
                                checked={form.values.status === "active"}
                                onChange={(e) => form.setFieldValue("status", e.currentTarget.checked ? "active" : "paused")}
                            />
                        </Group>
                    )}

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
        </Modal >
    );
}
