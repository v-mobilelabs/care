"use client";

import {
    Box,
    Button,
    Group,
    LoadingOverlay,
    Modal,
    Paper,
    Stack,
    Text,
    Textarea,
    ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconSparkles, IconStethoscope } from "@tabler/icons-react";
import { useState } from "react";
import {
    useAddSymptomObservationMutation,
    type AddSymptomObservationPayload,
} from "@/ui/ai/query";
import { colors } from "@/ui/tokens";

interface FormValues {
    symptomInput: string;
}

type SymptomTrend = "improving" | "stable" | "worsening";

interface StructuredSymptomPreview {
    symptom: string;
    severity?: number;
    state?: SymptomTrend;
    onset?: string;
    duration?: string;
    triggers?: string[];
    alleviators?: string[];
    associatedSymptoms?: string[];
    notes?: string;
}

const REQUIRED_FIELDS = ["symptom", "severity", "state", "onset", "duration"] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

function validateForm(values: FormValues) {
    return {
        symptomInput: values.symptomInput.trim().length < 4
            ? "Please describe your symptom in a short sentence"
            : null,
    };
}

function getMissingFields(preview: StructuredSymptomPreview | null): RequiredField[] {
    if (preview === null) {
        return [...REQUIRED_FIELDS];
    }

    const missing: RequiredField[] = [];

    if (!preview.symptom.trim()) missing.push("symptom");
    if (typeof preview.severity !== "number") missing.push("severity");
    if (!preview.state) missing.push("state");
    if (!preview.onset) missing.push("onset");
    if (!preview.duration) missing.push("duration");

    return missing;
}

function toHumanSymptom(value?: string): string {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return "your symptom";
    return `your ${normalized}`;
}

function getQuestionForMissingField(args: {
    field: RequiredField;
    symptom?: string;
}): string {
    const symptomText = toHumanSymptom(args.symptom);

    if (args.field === "symptom") {
        return "What symptom are you noticing most right now?";
    }

    if (args.field === "severity") {
        return `How severe is ${symptomText} from 1 to 10?`;
    }

    if (args.field === "state") {
        return `Is ${symptomText} improving, stable, or getting worse?`;
    }

    if (args.field === "onset") {
        return `When did ${symptomText} start?`;
    }

    return `How long has ${symptomText} been happening?`;
}

function toPreview(body: {
    symptom?: string;
    severity?: number;
    state?: SymptomTrend;
    onset?: string;
    duration?: string;
    triggers?: string[];
    alleviators?: string[];
    associatedSymptoms?: string[];
    notes?: string;
}, fallbackSymptom: string): StructuredSymptomPreview {
    return {
        symptom: body.symptom ?? fallbackSymptom,
        ...(body.severity === undefined ? {} : { severity: body.severity }),
        ...(body.state ? { state: body.state } : {}),
        ...(body.onset ? { onset: body.onset } : {}),
        ...(body.duration ? { duration: body.duration } : {}),
        ...(body.triggers ? { triggers: body.triggers } : {}),
        ...(body.alleviators ? { alleviators: body.alleviators } : {}),
        ...(body.associatedSymptoms
            ? { associatedSymptoms: body.associatedSymptoms }
            : {}),
        ...(body.notes ? { notes: body.notes } : {}),
    };
}

function GuidanceCard() {
    return (
        <Paper withBorder radius="lg" p="md">
            <Group gap="sm" align="flex-start" wrap="nowrap">
                <ThemeIcon size={32} radius="xl" color={colors.brand} variant="light">
                    <IconStethoscope size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                    <Text fw={600} size="sm">Describe what you’re feeling</Text>
                    <Text size="xs" c="dimmed" lh={1.5}>
                        Keep it simple. Mention symptom, severity (1–10), trend,
                        when it started, and how long it has been happening.
                    </Text>
                </Stack>
            </Group>
        </Paper>
    );
}

function PreviewCard({
    preview,
}: Readonly<{ preview: StructuredSymptomPreview }>) {
    return (
        <Paper withBorder radius="lg" p="md">
            <Stack gap="xs">
                <Group gap="xs" align="center">
                    <ThemeIcon size={28} radius="xl" color={colors.brand} variant="light">
                        <IconSparkles size={16} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={600} size="sm">Structured preview</Text>
                        <Text size="xs" c="dimmed">
                            This is what will be saved to your symptom timeline.
                        </Text>
                    </Box>
                </Group>
                <Stack gap={6}>
                    <Text size="sm"><strong>Symptom:</strong> {preview.symptom}</Text>
                    {typeof preview.severity === "number" ? (
                        <Text size="sm"><strong>Severity:</strong> {preview.severity}/10</Text>
                    ) : null}
                    {preview.state ? (
                        <Text size="sm"><strong>Trend:</strong> {preview.state}</Text>
                    ) : null}
                    {preview.onset ? (
                        <Text size="sm"><strong>Onset:</strong> {preview.onset}</Text>
                    ) : null}
                    {preview.duration ? (
                        <Text size="sm"><strong>Duration:</strong> {preview.duration}</Text>
                    ) : null}
                </Stack>
            </Stack>
        </Paper>
    );
}

function MissingDetailsCard({
    questions,
}: Readonly<{ questions: string[] }>) {
    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{
                background: "light-dark(var(--mantine-color-warning-0), rgba(255, 179, 0, 0.08))",
                borderColor: "light-dark(var(--mantine-color-warning-2), rgba(255, 179, 0, 0.24))",
            }}
        >
            <Stack gap="xs">
                <Text fw={600} size="sm">Add a little more detail</Text>
                <Stack gap={4}>
                    {questions.map((question) => (
                        <Text key={question} size="sm">
                            • {question}
                        </Text>
                    ))}
                </Stack>
            </Stack>
        </Paper>
    );
}

function ErrorCard({ message }: Readonly<{ message: string }>) {
    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{
                background: "light-dark(var(--mantine-color-danger-0), rgba(255, 76, 76, 0.08))",
                borderColor: "light-dark(var(--mantine-color-danger-2), rgba(255, 76, 76, 0.24))",
            }}
        >
            <Stack gap={4}>
                <Text fw={600} size="sm">We couldn’t parse this clearly</Text>
                <Text size="sm">{message}</Text>
            </Stack>
        </Paper>
    );
}

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

    const [preview, setPreview] = useState<StructuredSymptomPreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewPending, setPreviewPending] = useState(false);
    const [lastParsedInput, setLastParsedInput] = useState<string>("");

    const form = useForm<FormValues>({
        initialValues: { symptomInput: "" },
        validate: validateForm,
    });

    const missingFields = getMissingFields(preview);
    const missingQuestions = missingFields.map((field) =>
        getQuestionForMissingField({ field, symptom: preview?.symptom }),
    );

    const hasPreview = preview !== null;
    const hasMissingFields = missingFields.length > 0;

    const isSaveDisabled =
        mutation.isPending ||
        isPreviewPending ||
        !hasPreview ||
        hasMissingFields;

    function resetPreviewState() {
        setPreview(null);
        setPreviewError(null);
        setLastParsedInput("");
    }

    function handleInputEdited() {
        if (preview !== null || previewError !== null || lastParsedInput.length > 0) {
            resetPreviewState();
        }
    }

    async function parseFromInput(input: string): Promise<void> {
        setPreviewPending(true);
        setPreviewError(null);

        try {
            const response = await fetch("/api/symptom-observations/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symptom: input }),
            });

            const body = (await response.json().catch(() => ({}))) as {
                error?: { message?: string };
                symptom?: string;
                severity?: number;
                state?: "improving" | "stable" | "worsening";
                onset?: string;
                duration?: string;
                triggers?: string[];
                alleviators?: string[];
                associatedSymptoms?: string[];
                notes?: string;
            };

            if (!response.ok) {
                setPreview(null);
                setPreviewError(body.error?.message ?? "Could not parse symptom details.");
                return;
            }

            setPreview(toPreview(body, input));
            setLastParsedInput(input);
        } catch {
            setPreview(null);
            setPreviewError("Could not parse symptom details.");
        } finally {
            setPreviewPending(false);
        }
    }

    async function handleGenerateFromBlur(): Promise<void> {
        const validation = form.validate();
        if (validation.hasErrors) {
            setPreview(null);
            return;
        }

        const input = form.values.symptomInput.trim();
        if (!input) {
            setPreview(null);
            setPreviewError(null);
            return;
        }

        if (input === lastParsedInput && preview !== null) {
            return;
        }

        await parseFromInput(input);
    }

    function handleSubmit(): void {
        if (preview === null || missingFields.length > 0) {
            return;
        }

        const payload: AddSymptomObservationPayload = {
            symptom: preview.symptom,
            severity: preview.severity,
            state: preview.state,
            onset: preview.onset,
            duration: preview.duration,
            triggers: preview.triggers,
            alleviators: preview.alleviators,
            associatedSymptoms: preview.associatedSymptoms,
            notes: preview.notes,
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
                resetPreviewState();
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

    function handleClose(): void {
        form.reset();
        resetPreviewState();
        onClose();
    }

    const symptomInputProps = form.getInputProps("symptomInput");

    return (
        <Modal opened={opened} onClose={handleClose} title="Log a symptom" size="md">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Box pos="relative">
                    <LoadingOverlay
                        visible={isPreviewPending}
                        zIndex={1000}
                        overlayProps={{ radius: "md", blur: 2 }}
                        loaderProps={{ color: "primary" }}
                    />
                    <Stack gap="md">
                        <GuidanceCard />
                        <Textarea
                            label="Describe your symptom"
                            placeholder="e.g. I have mild headache since this morning, around 3 out of 10, stable till now"
                            required
                            rows={4}
                            autosize
                            maxRows={6}
                            {...symptomInputProps}
                            onChange={(event) => {
                                symptomInputProps.onChange(event);
                                handleInputEdited();
                            }}
                            onBlur={() => {
                                symptomInputProps.onBlur();
                                handleGenerateFromBlur().catch(() => undefined);
                            }}
                        />
                        <Text size="xs" c="dimmed">
                            AI structures this entry for your timeline. It is for personal tracking and does not replace medical advice.
                        </Text>
                        {previewError ? <ErrorCard message={previewError} /> : null}
                        {hasPreview && hasMissingFields ? (
                            <MissingDetailsCard questions={missingQuestions} />
                        ) : null}
                        {hasPreview ? <PreviewCard preview={preview} /> : null}
                        <Group justify="flex-end" gap="sm">
                            <Button variant="subtle" color={colors.muted} onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                color={colors.brand}
                                loading={mutation.isPending}
                                disabled={isSaveDisabled}
                            >
                                Save
                            </Button>
                        </Group>
                    </Stack>
                </Box>
            </form>
        </Modal>
    );
}
