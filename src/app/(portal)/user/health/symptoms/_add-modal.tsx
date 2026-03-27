"use client";
import {
    Button,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import {
    useAddSymptomObservationMutation,
    type AddSymptomObservationPayload,
    type SymptomObservationState,
} from "@/ui/ai/query";
import { colors } from "@/ui/tokens";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
    symptom: string;
    severity: number | "";
    state: SymptomObservationState | "";
    onset: string;
    duration: string;
    notes: string;
}

// ── Validators ────────────────────────────────────────────────────────────────

function validateForm(values: FormValues) {
    return {
        symptom: values.symptom.trim().length < 2
            ? "Please describe the symptom (at least 2 characters)"
            : null,
        severity:
            values.severity !== "" &&
            (Number(values.severity) < 1 || Number(values.severity) > 10)
                ? "Severity must be between 1 and 10"
                : null,
    };
}

// ── Form fields ───────────────────────────────────────────────────────────────

function ObservationFormFields({
    form,
    isPending,
    onCancel,
}: Readonly<{
    form: ReturnType<typeof useForm<FormValues>>;
    isPending: boolean;
    onCancel: () => void;
}>) {
    return (
        <Stack gap="md">
            <TextInput
                label="Symptom"
                placeholder="e.g. Chest tightness, fatigue, joint pain"
                required
                {...form.getInputProps("symptom")}
            />
            <Group grow gap="sm">
                <NumberInput
                    label="Severity (1–10)"
                    placeholder="e.g. 6"
                    min={1}
                    max={10}
                    {...form.getInputProps("severity")}
                />
                <Select
                    label="Trend"
                    placeholder="Select trend"
                    data={[
                        { value: "improving", label: "Improving" },
                        { value: "stable", label: "Stable" },
                        { value: "worsening", label: "Worsening" },
                    ]}
                    clearable
                    {...form.getInputProps("state")}
                />
            </Group>
            <Group grow gap="sm">
                <TextInput
                    label="Onset"
                    placeholder="e.g. This morning, 2 days ago"
                    {...form.getInputProps("onset")}
                />
                <TextInput
                    label="Duration"
                    placeholder="e.g. 30 minutes, intermittent"
                    {...form.getInputProps("duration")}
                />
            </Group>
            <Textarea
                label="Notes"
                placeholder="Any additional context, medications tried, activities…"
                rows={3}
                autosize
                maxRows={6}
                {...form.getInputProps("notes")}
            />
            <Text size="xs" c="dimmed" lh={1.5}>
                This record is for personal reference only and does not
                constitute medical advice.
            </Text>
            <Group justify="flex-end" gap="sm">
                <Button variant="subtle" color="gray" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" color="grape" loading={isPending}>
                    Save
                </Button>
            </Group>
        </Stack>
    );
}

// ── Add Observation Modal ─────────────────────────────────────────────────────

export function AddObservationModal({
    opened,
    conditionId,
    onClose,
}: Readonly<{
    opened: boolean;
    conditionId?: string;
    onClose: () => void;
}>) {
    const mutation = useAddSymptomObservationMutation({ conditionId });

    const form = useForm<FormValues>({
        initialValues: {
            symptom: "",
            severity: "",
            state: "",
            onset: "",
            duration: "",
            notes: "",
        },
        validate: validateForm,
    });

    function handleSubmit(values: FormValues) {
        const payload: AddSymptomObservationPayload = {
            symptom: values.symptom.trim(),
            severity: values.severity === "" ? undefined : Number(values.severity),
            state: values.state === "" ? undefined : values.state,
            onset: values.onset.trim() || undefined,
            duration: values.duration.trim() || undefined,
            notes: values.notes.trim() || undefined,
            source: "manual",
            conditionId,
        };

        mutation.mutate(payload, {
            onSuccess: () => {
                notifications.show({
                    title: "Symptom logged",
                    message: "Your observation has been added to the timeline.",
                    color: colors.success,
                    icon: <IconCheck size={16} />,
                });
                form.reset();
                onClose();
            },
            onError: () => {
                notifications.show({
                    title: "Failed to save",
                    message: "Could not log symptom. Please try again.",
                    color: colors.danger,
                });
            },
        });
    }

    function handleClose() {
        form.reset();
        onClose();
    }

    return (
        <Modal opened={opened} onClose={handleClose} title="Log a symptom" size="md">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <ObservationFormFields
                    form={form}
                    isPending={mutation.isPending}
                    onCancel={handleClose}
                />
            </form>
        </Modal>
    );
}
