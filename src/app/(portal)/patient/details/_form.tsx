"use client";

import {
    Box,
    Card,
    Chip,
    Group,
    Loader,
    Paper,
    Slider,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    IconActivity,
    IconCheck,
    IconDroplet,
    IconRuler2,
    IconSalad,
    IconUser,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api/fetch";
import { colors } from "@/ui/tokens";
import { chatKeys } from "@/app/(portal)/patient/_keys";

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
    { value: "sedentary", label: "Sedentary" },
    { value: "light", label: "Light" },
    { value: "moderate", label: "Moderate" },
    { value: "active", label: "Active" },
    { value: "very_active", label: "Very active" },
];

const FOOD_PREFERENCES = [
    "Vegetarian",
    "Vegan",
    "Gluten-free",
    "Dairy-free",
    "Nut-free",
    "Halal",
    "Kosher",
    "Low-carb",
    "Keto",
    "Paleo",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface DetailsFormValues {
    height: number;
    weight: number;
    bloodGroup: string;
    foodPreferences: string[];
    activityLevel: string;
    sex: string;
}

type PatientPatch = Partial<{
    height: number;
    weight: number;
    bloodGroup: string;
    foodPreferences: string[];
    activityLevel: ActivityLevel;
    sex: "male" | "female";
}>;

// ── Mutations ───────────────────────────────────────────────────────────────

function usePatientPatch() {
    const qc = useQueryClient();
    const key = chatKeys.patientDetails();
    return useMutation({
        mutationFn: (data: PatientPatch) =>
            apiFetch("/api/patients/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        onMutate: async (patch) => {
            await qc.cancelQueries({ queryKey: key });
            const snapshot = qc.getQueryData(key);
            qc.setQueryData(key, (prev: Record<string, unknown> | undefined) => ({ ...prev, ...patch }));
            return { snapshot };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.snapshot !== undefined) qc.setQueryData(key, ctx.snapshot);
            notifications.show({ title: "Save failed", message: "Please try again.", color: "red" });
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: key });
        },
    });
}

// ── Saved indicator ─────────────────────────────────────────────────────────────

function SavedBadge({ saving }: Readonly<{ saving: boolean }>) {
    const [visible, setVisible] = useState(false);
    const prevSaving = useRef(false);

    useEffect(() => {
        if (prevSaving.current && !saving) {
            const t1 = setTimeout(() => setVisible(true), 0);
            const t2 = setTimeout(() => setVisible(false), 1800);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        prevSaving.current = saving;
    }, [saving]);

    if (saving) return <Loader size={14} color={colors.success} />;
    if (visible) {
        return (
            <ThemeIcon size={16} color={colors.success} variant="transparent">
                <IconCheck size={14} />
            </ThemeIcon>
        );
    }
    return null;
}

// ── Section wrapper ──────────────────────────────────────────────────────────────

function Section({
    label,
    description,
    saving,
    children,
}: Readonly<{ label: string; description?: string; saving: boolean; children: React.ReactNode }>) {
    return (
        <Stack gap={8}>
            <Group gap={6} align="center">
                <Text size="sm" fw={500}>{label}</Text>
                <SavedBadge saving={saving} />
            </Group>
            {description ? <Text size="xs" c="dimmed" mt={-4}>{description}</Text> : null}
            {children}
        </Stack>
    );
}

// ── Card with section header ──────────────────────────────────────────────────

function FormCard({
    icon,
    title,
    children,
}: Readonly<{ icon: React.ReactNode; title: string; children: React.ReactNode }>) {
    return (
        <Card withBorder radius="lg">
            <Card.Section withBorder style={{ background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" }}>
                <Group gap="sm" align="center" p="md">
                    <ThemeIcon size={36} radius="md" variant="light" color="primary">
                        {icon}
                    </ThemeIcon>
                    <Text fw={600} size="md">{title}</Text>
                </Group>
            </Card.Section>
            <Card.Section p="md">
                {children}
            </Card.Section>
        </Card>
    );
}

// ── Slider field (auto-save on drag end) ───────────────────────────────────────

function SliderField({
    label,
    description,
    min,
    max,
    step,
    unit,
    marks,
    initialValue,
    field,
}: Readonly<{
    label: string;
    description?: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    marks: { value: number; label: string }[];
    initialValue: number;
    field: keyof Pick<PatientPatch, "height" | "weight">;
}>) {
    const patch = usePatientPatch();
    const [value, setValue] = useState(initialValue > 0 ? initialValue : min);

    function handleChangeEnd(v: number) {
        if (v === initialValue) return;
        void patch.mutateAsync({ [field]: v } as PatientPatch);
    }

    return (
        <Section label={label} description={description} saving={patch.isPending}>
            <Box>
                <Group justify="space-between" mb={4}>
                    <Text size="xs" c="dimmed">{min} {unit}</Text>
                    <Text size="sm" fw={600} c="primary">{value} {unit}</Text>
                    <Text size="xs" c="dimmed">{max} {unit}</Text>
                </Group>
                <Slider
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={setValue}
                    onChangeEnd={handleChangeEnd}
                    marks={marks}
                    color="primary"
                    size="md"
                    mb="md"
                />
            </Box>
        </Section>
    );
}

// ── Chip section (single-select) ───────────────────────────────────────────────

function ChipSingle<T extends string>({
    label,
    description,
    options,
    initialValue,
    field,
}: Readonly<{
    label: string;
    description?: string;
    options: { value: T; label: string }[];
    initialValue: T | "";
    field: keyof PatientPatch;
}>) {
    const patch = usePatientPatch();
    const [selected, setSelected] = useState<T | "">(initialValue);

    function handleChange(val: string) {
        const next = val as T;
        setSelected(next);
        void patch.mutateAsync({ [field]: next || undefined } as PatientPatch);
    }

    return (
        <Section label={label} description={description} saving={patch.isPending}>
            <Chip.Group value={selected} onChange={(v) => handleChange(v as string)}>
                <Group gap="xs">
                    {options.map((opt) => (
                        <Chip key={opt.value} value={opt.value} variant="light" size="sm">
                            {opt.label}
                        </Chip>
                    ))}
                </Group>
            </Chip.Group>
        </Section>
    );
}

// ── Chip section (multi-select) ───────────────────────────────────────────────

function ChipMulti({
    label,
    description,
    options,
    initialValue,
}: Readonly<{
    label: string;
    description?: string;
    options: string[];
    initialValue: string[];
}>) {
    const patch = usePatientPatch();
    const [selected, setSelected] = useState<string[]>(initialValue);

    function handleChange(vals: string[]) {
        setSelected(vals);
        void patch.mutateAsync({ foodPreferences: vals });
    }

    return (
        <Section label={label} description={description} saving={patch.isPending}>
            <Chip.Group multiple value={selected} onChange={handleChange}>
                <Group gap="xs" style={{ flexWrap: "wrap" }}>
                    {options.map((opt) => (
                        <Chip key={opt} value={opt} variant="light" size="sm">
                            {opt}
                        </Chip>
                    ))}
                </Group>
            </Chip.Group>
        </Section>
    );
}

// ── Main form ────────────────────────────────────────────────────────────────

export interface DetailsFormProps {
    initialValues: DetailsFormValues;
}

export function DetailsForm({ initialValues }: Readonly<DetailsFormProps>) {
    return (
        <Stack gap="md">
            {/* Body Measurements */}
            <FormCard icon={<IconRuler2 size={20} />} title="Body Measurements">
                <Stack gap="md">
                    <SliderField
                        label="Height"
                        description="centimetres (cm)"
                        min={100}
                        max={250}
                        step={1}
                        unit="cm"
                        marks={[
                            { value: 100, label: "100" },
                            { value: 150, label: "150" },
                            { value: 200, label: "200" },
                            { value: 250, label: "250" },
                        ]}
                        initialValue={initialValues.height as number}
                        field="height"
                    />
                    <SliderField
                        label="Weight"
                        description="kilograms (kg)"
                        min={20}
                        max={200}
                        step={0.5}
                        unit="kg"
                        marks={[
                            { value: 20, label: "20" },
                            { value: 80, label: "80" },
                            { value: 140, label: "140" },
                            { value: 200, label: "200" },
                        ]}
                        initialValue={initialValues.weight as number}
                        field="weight"
                    />
                </Stack>
            </FormCard>

            {/* Personal Information */}
            <FormCard icon={<IconUser size={20} />} title="Personal Information">
                <ChipSingle
                    label="Biological sex"
                    description="Used for health calculations"
                    options={[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                    ]}
                    initialValue={initialValues.sex as "male" | "female" | ""}
                    field="sex"
                />
            </FormCard>

            {/* Medical */}
            <FormCard icon={<IconDroplet size={20} />} title="Medical">
                <ChipSingle
                    label="Blood group"
                    options={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
                    initialValue={initialValues.bloodGroup}
                    field="bloodGroup"
                />
            </FormCard>

            {/* Lifestyle */}
            <FormCard icon={<IconActivity size={20} />} title="Activity">
                <ChipSingle
                    label="Activity level"
                    options={ACTIVITY_LEVELS}
                    initialValue={initialValues.activityLevel as ActivityLevel | ""}
                    field="activityLevel"
                />
            </FormCard>

            {/* Food Preferences */}
            <FormCard icon={<IconSalad size={20} />} title="Food Preferences">
                <ChipMulti
                    label="Dietary preferences"
                    description="Select all that apply"
                    options={FOOD_PREFERENCES}
                    initialValue={initialValues.foodPreferences}
                />
            </FormCard>
        </Stack>
    );
}

