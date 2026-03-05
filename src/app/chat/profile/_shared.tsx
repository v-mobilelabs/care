"use client";
/**
 * Shared constants, helpers, and primitive components used across
 * all profile section files. Keep this file free of business logic.
 */
import {
    Box,
    Button,
    Divider,
    Group,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { IconCheck } from "@tabler/icons-react";
import type { DependentRecord, Relationship } from "@/app/chat/_query";

// ── Constants ─────────────────────────────────────────────────────────────────

export const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
    "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
    "Czech Republic", "Denmark", "Egypt", "Ethiopia", "Finland", "France",
    "Germany", "Ghana", "Greece", "Hungary", "India", "Indonesia", "Iran",
    "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Kuwait",
    "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria",
    "Norway", "Pakistan", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa",
    "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Thailand",
    "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom",
    "United States", "Vietnam", "Other",
];

export const RELATIONSHIP_OPTIONS: Relationship[] = [
    "Spouse / Partner", "Child", "Parent",
    "Sibling", "Grandparent", "Grandchild", "Other",
];

export const FOOD_PREFERENCE_SUGGESTIONS = [
    "Vegetarian", "Vegan", "Non-vegetarian",
    "Gluten-free", "Dairy-free", "Nut-free",
    "Halal", "Kosher", "Low-carb", "Keto",
    "Low-sodium", "Low-fat", "High-protein",
    "Paleo", "Diabetic-friendly",
];

// ── Date helpers ──────────────────────────────────────────────────────────────

export function isoToDate(iso?: string): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
}

export function parseDMY(value: string): Date {
    const parts = value.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const day = parseInt(parts[0]!, 10);
        const month = parseInt(parts[1]!, 10) - 1;
        const year = parseInt(parts[2]!, 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date(value);
}

export function dateToIso(d: Date | null | unknown): string | undefined {
    if (!d) return undefined;
    if (d instanceof Date) return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
    if (typeof d === "string" && d.trim()) {
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
    }
    return undefined;
}

export function bmiInfo(heightCm: number, weightKg: number) {
    const h = heightCm / 100;
    const bmi = weightKg / (h * h);
    const value = Math.round(bmi * 10) / 10;
    if (bmi < 18.5) return { value, label: "Underweight", color: "blue" };
    if (bmi < 25) return { value, label: "Normal", color: "success" };
    if (bmi < 30) return { value, label: "Overweight", color: "warning" };
    return { value, label: "Obese", color: "danger" };
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

export function SectionHeader({
    icon,
    title,
    subtitle,
    color = "primary",
    action,
}: Readonly<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    color?: string;
    action?: React.ReactNode;
}>) {
    return (
        <Group justify="space-between" align="flex-start">
            <Group gap="sm" align="flex-start" style={{ flex: 1 }}>
                <ThemeIcon size={32} radius="md" color={color} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                    {icon}
                </ThemeIcon>
                <Box>
                    <Text fw={600} size="sm" lh={1.3}>{title}</Text>
                    {subtitle && <Text size="xs" c="dimmed" mt={2} lh={1.4}>{subtitle}</Text>}
                </Box>
            </Group>
            {action}
        </Group>
    );
}

// ── DependentForm ─────────────────────────────────────────────────────────────

const SEX_DATA = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
];

const ACTIVITY_LEVEL_DATA = [
    { value: "sedentary", label: "Sedentary — little or no exercise" },
    { value: "light", label: "Light — 1–3 days / week" },
    { value: "moderate", label: "Moderate — 3–5 days / week" },
    { value: "active", label: "Active — 6–7 days / week" },
    { value: "very_active", label: "Very Active — hard exercise daily" },
];

interface DependentFormValues {
    firstName: string;
    lastName: string;
    relationship: Relationship | "";
    dateOfBirth: Date | null;
    sex: string;
    height: number | undefined;
    weight: number | undefined;
    waistCm: number | undefined;
    neckCm: number | undefined;
    hipCm: number | undefined;
    activityLevel: string;
    country: string;
    city: string;
}

type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export function DependentForm({
    existing,
    onSave,
    onCancel,
    submitLabel,
}: Readonly<{
    existing?: DependentRecord;
    onSave: (data: {
        firstName: string; lastName: string; relationship: Relationship;
        dateOfBirth?: string; sex?: "male" | "female";
        height?: number; weight?: number;
        waistCm?: number; neckCm?: number; hipCm?: number;
        activityLevel?: ActivityLevel;
        country?: string; city?: string;
    }) => void;
    onCancel?: () => void;
    submitLabel?: string;
}>) {
    const form = useForm<DependentFormValues>({
        initialValues: {
            firstName: existing?.firstName ?? "",
            lastName: existing?.lastName ?? "",
            relationship: existing?.relationship ?? "",
            dateOfBirth: isoToDate(existing?.dateOfBirth),
            sex: existing?.sex ?? "",
            height: existing?.height,
            weight: existing?.weight,
            waistCm: existing?.waistCm,
            neckCm: existing?.neckCm,
            hipCm: existing?.hipCm,
            activityLevel: existing?.activityLevel ?? "",
            country: existing?.country ?? "",
            city: existing?.city ?? "",
        },
        validate: {
            firstName: (v) => v.trim() ? null : "First name is required",
            relationship: (v) => v ? null : "Relationship is required",
        },
    });

    return (
        <form onSubmit={form.onSubmit((v) => onSave({
            firstName: v.firstName.trim(),
            lastName: v.lastName.trim(),
            relationship: v.relationship as Relationship,
            dateOfBirth: dateToIso(v.dateOfBirth),
            sex: (v.sex as "male" | "female") || undefined,
            height: v.height,
            weight: v.weight,
            waistCm: v.waistCm,
            neckCm: v.neckCm,
            hipCm: v.hipCm,
            activityLevel: v.activityLevel ? v.activityLevel as ActivityLevel : undefined,
            country: v.country || undefined,
            city: v.city || undefined,
        }))}>
            <Stack gap="sm" pb="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput size="sm" label="First name" placeholder="Jane" required {...form.getInputProps("firstName")} />
                    <TextInput size="sm" label="Last name" placeholder="Smith" {...form.getInputProps("lastName")} />
                </SimpleGrid>
                <Select
                    size="sm"
                    label="Relationship"
                    placeholder="Select relationship"
                    required
                    data={RELATIONSHIP_OPTIONS}
                    {...form.getInputProps("relationship")}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <DateInput
                        size="sm"
                        label="Date of birth"
                        placeholder="DD/MM/YYYY"
                        valueFormat="DD/MM/YYYY"
                        dateParser={parseDMY}
                        maxDate={new Date()}
                        clearable
                        {...form.getInputProps("dateOfBirth")}
                    />
                    <Select
                        size="sm"
                        label="Biological sex"
                        placeholder="Select sex"
                        data={SEX_DATA}
                        clearable
                        {...form.getInputProps("sex")}
                    />
                </SimpleGrid>
                <Divider label="Physical measurements" labelPosition="left" />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <NumberInput size="sm" label="Height (cm)" placeholder="170" min={50} max={300} {...form.getInputProps("height")} />
                    <NumberInput size="sm" label="Weight (kg)" placeholder="70" min={10} max={500} decimalScale={1} {...form.getInputProps("weight")} />
                    <NumberInput size="sm" label="Waist (cm)" placeholder="80" min={30} max={250} decimalScale={1} {...form.getInputProps("waistCm")} />
                    <NumberInput size="sm" label="Neck (cm)" placeholder="35" min={20} max={80} decimalScale={1} {...form.getInputProps("neckCm")} />
                    <NumberInput size="sm" label="Hip (cm)" placeholder="95" min={50} max={250} decimalScale={1} {...form.getInputProps("hipCm")} />
                </SimpleGrid>
                <Select
                    size="sm"
                    label="Activity level"
                    placeholder="Select activity level"
                    data={ACTIVITY_LEVEL_DATA}
                    clearable
                    {...form.getInputProps("activityLevel")}
                />
                <Divider label="Location" labelPosition="left" />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Select size="sm" label="Country" placeholder="Select country" searchable data={COUNTRIES} {...form.getInputProps("country")} />
                    <TextInput size="sm" label="City" placeholder="Chennai" {...form.getInputProps("city")} />
                </SimpleGrid>
                <Group justify="flex-end" mt={4}>
                    {onCancel && (
                        <Button variant="default" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" color="primary" leftSection={<IconCheck size={16} />}>
                        {submitLabel ?? (existing ? "Save changes" : "Add family member")}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
