"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Chip,
    Group,
    LoadingOverlay,
    Modal,
    Paper,
    ScrollArea,
    Stack,
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
    IconRefresh,
    IconSparkles,
    IconSpray,
    IconSticker,
    IconWind,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useAddMedicationMutation,
    useMedicationMatchMutation,
    useUpdateMedicationMutation,
    type MedicationRecord,
    type MedicationMatchRecord,
    type MedicationStatus,
    type AddMedicationPayload,
} from "@/app/(portal)/user/_query";
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

// eslint-disable-next-line max-lines-per-function
export function MedicationModal({ opened, onClose, initial }: Readonly<MedicationModalProps>) {
    const addMutation = useAddMedicationMutation();
    const matchMutation = useMedicationMatchMutation();
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
    const [matchOptions, setMatchOptions] = useState<MedicationMatchRecord[]>([]);
    const [matchError, setMatchError] = useState<string | null>(null);
    const [lastMatchedQuery, setLastMatchedQuery] = useState<string>("");
    const [selectedMatch, setSelectedMatch] = useState<MedicationMatchRecord | null>(null);
    const [isChangingDrug, setIsChangingDrug] = useState(!isEdit);

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
        setMatchOptions([]);
        setMatchError(null);
        setLastMatchedQuery("");
        setSelectedMatch(null);
        setIsChangingDrug(!isEdit);
        const resetPreset = (() => {
            if (isPreset) return initFreq;
            if (initFreq) return "custom";
            return "";
        })();
        setFreqPreset(resetPreset);
        setFreqCustom(isPreset ? "" : initFreq);
    }

    function clearMatchState() {
        setMatchOptions([]);
        setMatchError(null);
        setLastMatchedQuery("");
    }

    function handleApplySmartMatch(match: MedicationMatchRecord) {
        form.setFieldValue("name", match.brandName ?? match.name);
        if (match.dosage) {
            form.setFieldValue("dosage", match.dosage);
        }
        if (match.form) {
            const normalizedForm = FORM_OPTIONS.find(
                (f) => f.value.toLowerCase() === match.form!.toLowerCase(),
            )?.value ?? match.form;
            form.setFieldValue("form", normalizedForm);
        }
        setSelectedMatch(match);
        setIsChangingDrug(false);
        setMatchOptions([]);
        setMatchError(null);
        setLastMatchedQuery(match.name);
    }

    function handleSmartSearch(query: string, options?: Readonly<{ refresh?: boolean; autoApplyFirst?: boolean }>) {
        const normalizedQuery = query.trim();
        if (normalizedQuery.length < 2) {
            clearMatchState();
            return;
        }

        if (!options?.refresh && normalizedQuery === lastMatchedQuery && matchOptions.length > 0) {
            return;
        }

        setMatchError(null);
        matchMutation.mutate(
            { query: normalizedQuery, limit: 8, ...(options?.refresh ? { refresh: true } : {}) },
            {
                onSuccess: (result) => {
                    if (options?.autoApplyFirst) {
                        const freshest = result.matches[0];
                        if (freshest) {
                            handleApplySmartMatch(freshest);
                            notifications.show({
                                title: "Medication refreshed",
                                message: "Latest medication details applied to this form.",
                                color: colors.success,
                                icon: <IconCheck size={16} />,
                            });
                            return;
                        }
                    }

                    setMatchOptions(result.matches);
                    setLastMatchedQuery(normalizedQuery);
                    if (result.matches.length === 0) {
                        setMatchError("No close medication matches found.");
                    }
                },
                onError: (error) => {
                    setMatchOptions([]);
                    setLastMatchedQuery(normalizedQuery);
                    setMatchError(error instanceof Error ? error.message : "Could not retrieve medication matches.");
                },
            },
        );
    }

    function handleRefreshDrug() {
        const query = selectedMatch?.brandName ?? selectedMatch?.name ?? form.values.name;
        if (!query.trim()) {
            return;
        }

        handleSmartSearch(query, { refresh: true, autoApplyFirst: true });
    }

    function handleSubmit(values: MedicationFormValues) {
        const hasNameChangedInEdit = isEdit && initial
            ? values.name.trim().toLowerCase() !== initial.name.trim().toLowerCase()
            : true;
        const requiresSmartSelection = !isEdit || hasNameChangedInEdit;
        if (requiresSmartSelection && !selectedMatch) {
            setMatchError("Select a medication from Smart medication matches before saving.");
            notifications.show({
                title: "Select from matches",
                message: "Manual medication entry is disabled. Please choose a smart match.",
                color: colors.warning,
            });
            return;
        }

        const frequency = freqPreset === "custom"
            ? freqCustom.trim() || undefined
            : freqPreset || undefined;

        if (!frequency) {
            notifications.show({
                title: "Frequency required",
                message: "Please choose the medication frequency before saving.",
                color: colors.warning,
            });
            return;
        }

        const dosage = values.dosage.trim();
        const form = values.form.trim();

        if (!dosage) {
            notifications.show({
                title: "Dosage required",
                message: "Please select a medication with dosage information.",
                color: colors.warning,
            });
            return;
        }

        if (!form) {
            notifications.show({
                title: "Form required",
                message: "Please select a medication with form information.",
                color: colors.warning,
            });
            return;
        }

        const payload: AddMedicationPayload = {
            name: values.name.trim(),
            dosage,
            form,
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
    const hasNameChangedInEdit = isEdit && initial
        ? form.values.name.trim().toLowerCase() !== initial.name.trim().toLowerCase()
        : true;
    const requiresSmartSelection = !isEdit || hasNameChangedInEdit;
    const frequency = freqPreset === "custom"
        ? freqCustom.trim() || undefined
        : freqPreset || undefined;
    const hasDosage = form.values.dosage.trim().length > 0;
    const hasForm = form.values.form.trim().length > 0;
    const disableSubmit =
        isPending ||
        (requiresSmartSelection && !selectedMatch) ||
        !frequency ||
        !hasDosage ||
        !hasForm;
    const nameInputProps = form.getInputProps("name");

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
                <Box pos="relative">
                    <LoadingOverlay
                        visible={matchMutation.isPending}
                        zIndex={1000}
                        overlayProps={{ radius: "md", blur: 2 }}
                        loaderProps={{ color: "primary" }}
                    />
                    <Stack gap="md">

                        {/* ── Name ─────────────────────────────────────────── */}
                        <TextInput
                            label="Medication name"
                            placeholder="e.g. Metformin 500"
                            size="sm"
                            required
                            readOnly={isEdit && !isChangingDrug}
                            leftSection={<IconPill size={16} />}
                            rightSection={(
                                <Group gap={4} wrap="nowrap">
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        color="gray"
                                        onClick={handleRefreshDrug}
                                        loading={matchMutation.isPending}
                                        aria-label="Refresh medication from web"
                                    >
                                        <IconRefresh size={14} />
                                    </ActionIcon>
                                    <IconSparkles size={14} />
                                </Group>
                            )}
                            {...nameInputProps}
                            onChange={(event) => {
                                nameInputProps.onChange(event);
                                setSelectedMatch(null);
                                if (matchOptions.length > 0 || matchError) {
                                    clearMatchState();
                                }
                            }}
                            onBlur={(event) => {
                                if (isEdit && !isChangingDrug) {
                                    return;
                                }
                                nameInputProps.onBlur(event);
                                handleSmartSearch(event.currentTarget.value);
                            }}
                        />

                        {isEdit && !isChangingDrug && (
                            <Group justify="space-between" align="center">
                                <Text size="xs" c="dimmed">Drug name is locked for edits.</Text>
                                <Button
                                    variant="subtle"
                                    size="compact-sm"
                                    color="primary"
                                    onClick={() => {
                                        setIsChangingDrug(true);
                                        setSelectedMatch(null);
                                        setMatchError("Search and select a medication match to change drug.");
                                    }}
                                >
                                    Change drug
                                </Button>
                            </Group>
                        )}

                        <Text size="xs" c="dimmed">
                            Type to search and choose from smart matches. Manual medication entry is disabled.
                        </Text>
                        <Text size="xs" c="dimmed">
                            Use refresh to fetch the latest web data and sync it to this form + knowledge base.
                        </Text>

                        {(matchOptions.length > 0 || matchError) && (
                            <Stack gap="xs">
                                <Text size="xs">Smart medication matches</Text>
                                {matchError ? (
                                    <Text size="xs" c="dimmed">{matchError}</Text>
                                ) : null}
                                {matchOptions.map((match) => (
                                    <Paper key={match.id} withBorder radius="md" p="xs">
                                        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                                            <Box>
                                                <Text size="sm" fw={600}>{match.brandName ?? match.name}</Text>
                                                {match.genericName ? (
                                                    <Text size="xs" c="dimmed" mt={2}>
                                                        Generic: {match.genericName}
                                                    </Text>
                                                ) : null}
                                                <Group gap={6} mt={4}>
                                                    {match.dosage ? (
                                                        <Badge size="xs" variant="light" color="violet">{match.dosage}</Badge>
                                                    ) : null}
                                                    {match.form ? (
                                                        <Badge size="xs" variant="light" color="gray">{match.form}</Badge>
                                                    ) : null}
                                                    {match.drugType ? (
                                                        <Badge size="xs" variant="light" color="blue">{match.drugType}</Badge>
                                                    ) : null}
                                                    <Badge size="xs" variant="dot" color="teal">
                                                        {match.source === "knowledge_base" ? "knowledge base" : "web"}
                                                    </Badge>
                                                    <Badge size="xs" variant="outline" color="gray">{match.confidence}</Badge>
                                                </Group>
                                            </Box>
                                            <Box>
                                                <Button
                                                    variant="light"
                                                    size="compact-sm"
                                                    color="primary"
                                                    onClick={() => handleApplySmartMatch(match)}
                                                >
                                                    Use
                                                </Button>
                                            </Box>
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                        )}

                        {/* ── Dosage (auto from selected drug; read-only) ───── */}
                        <Group gap="xs" align="center">
                            <Text size="sm" fw={500}>Dosage</Text>
                            {form.values.dosage ? (
                                <Badge variant="light" color="violet" size="sm" leftSection={<IconDroplet size={12} />}>
                                    {form.values.dosage}
                                </Badge>
                            ) : (
                                <Text size="xs" c="dimmed">No dosage available for selected drug</Text>
                            )}
                            <Text size="xs" c="dimmed">auto-selected</Text>
                            {!hasDosage && <Badge size="xs" color="red" variant="light">Required</Badge>}
                        </Group>

                        {/* ── Form (auto-selected; read-only) ───────────────── */}
                        <Group gap="xs" align="center">
                            <Text size="sm" fw={500}>Form</Text>
                            {form.values.form ? (
                                <Badge variant="light" color="violet" size="sm">
                                    {form.values.form}
                                </Badge>
                            ) : (
                                <Text size="xs" c="dimmed">No form available for selected drug</Text>
                            )}
                            <Text size="xs" c="dimmed">auto-selected</Text>
                            {!hasForm && <Badge size="xs" color="red" variant="light">Required</Badge>}
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
                                    size="sm"
                                    placeholder="e.g. every 8 hours, with meals"
                                    leftSection={<IconClock size={16} />}
                                    value={freqCustom}
                                    onChange={(e) => setFreqCustom(e.currentTarget.value)}
                                />
                            )}
                        </Box>

                        <Group justify="flex-end" mt="xs">
                            <Button variant="default" onClick={handleClose} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" color="primary" loading={isPending} disabled={disableSubmit}>
                                {isEdit ? "Save changes" : "Add medication"}
                            </Button>
                        </Group>
                    </Stack>
                </Box>
            </form>
        </Modal >
    );
}
