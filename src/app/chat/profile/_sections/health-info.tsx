"use client";
import {
    Badge,
    Box,
    Button,
    Divider,
    Group,
    NumberInput,
    Paper,
    RingProgress,
    Select,
    SimpleGrid,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDroplet, IconFlame, IconMapPin, IconRuler, IconScale, IconUser } from "@tabler/icons-react";
import { calcProfileMetrics } from "@/lib/health-metrics";
import type { BiologicalSex, ActivityLevel } from "@/lib/health-metrics";

import { colors } from "@/ui/tokens";
import type { ProfileRecord } from "@/app/chat/_query";
import { trackEvent } from "@/lib/analytics";
import {
    SectionHeader,
    bmiInfo,
    dateToIso,
    isoToDate,
    parseDMY,
} from "../_shared";

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Form types ────────────────────────────────────────────────────────────────

export interface HealthInfoValues {
    dateOfBirth: Date | null;
    sex: string;
    height: number | undefined;
    weight: number | undefined;
    activityLevel: string;
    waistCm: number | undefined;
    neckCm: number | undefined;
    hipCm: number | undefined;
}

export interface HealthInfoFormProps {
    initial: Omit<HealthInfoValues, "dateOfBirth"> & { dateOfBirth: string };
    onSave: (data: Omit<HealthInfoValues, "dateOfBirth"> & { dateOfBirth?: string }) => void;
    saving: boolean;
}

// ── Metric card (read-only) ───────────────────────────────────────────────────

function MetricCard({
    icon,
    label,
    value,
    hint,
    color = "primary",
}: Readonly<{ icon: React.ReactNode; label: string; value: string; hint: string; color?: string }>) {
    return (
        <Group
            gap="xs"
            p="xs"
            style={{
                borderRadius: "var(--mantine-radius-md)",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
            }}
        >
            <ThemeIcon size="sm" variant="light" color={color} radius="sm">
                {icon}
            </ThemeIcon>
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="xs" c="dimmed" lh={1.2}>{label}</Text>
                <Text size="sm" fw={700} lh={1.3}>{value}</Text>
                <Text size="10px" c="dimmed" lh={1.2}>{hint}</Text>
            </Box>
        </Group>
    );
}

// ── Health Info Form ──────────────────────────────────────────────────────────

export function HealthInfoForm({ initial, onSave, saving }: Readonly<HealthInfoFormProps>) {
    const form = useForm<HealthInfoValues>({
        initialValues: { ...initial, dateOfBirth: isoToDate(initial.dateOfBirth) },
    });

    const liveHeight = form.values.height;
    const liveWeight = form.values.weight;
    const liveBmi = liveHeight && liveWeight ? bmiInfo(liveHeight, liveWeight) : null;

    const metrics = calcProfileMetrics({
        dateOfBirth: form.values.dateOfBirth ? (dateToIso(form.values.dateOfBirth) ?? undefined) : undefined,
        sex: (form.values.sex as BiologicalSex) || undefined,
        height: liveHeight,
        weight: liveWeight,
        waistCm: form.values.waistCm,
        neckCm: form.values.neckCm,
        hipCm: form.values.hipCm,
        activityLevel: (form.values.activityLevel as ActivityLevel) || undefined,
    });

    const hasMetrics = metrics.bmr || metrics.tdee || metrics.ibw || metrics.lbm || metrics.dailyWaterL;

    return (
        <form onSubmit={form.onSubmit((v) => onSave({ ...v, dateOfBirth: dateToIso(v.dateOfBirth) }))}>
            <Stack gap="md">
                {/* BMI summary */}
                {liveBmi && (
                    <Group
                        gap="md"
                        p="sm"
                        style={{
                            borderRadius: "var(--mantine-radius-md)",
                            background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                        }}
                    >
                        <RingProgress
                            size={56}
                            thickness={5}
                            roundCaps
                            sections={[{ value: Math.min((liveBmi.value / 40) * 100, 100), color: liveBmi.color }]}
                            label={<Text size="xs" fw={700} ta="center" lh={1}>{liveBmi.value}</Text>}
                        />
                        <Box>
                            <Text size="sm" fw={600}>BMI · {liveBmi.label}</Text>
                            <Text size="xs" c="dimmed">Based on your height &amp; weight</Text>
                            <Badge size="xs" mt={4} variant="light" color={liveBmi.color}>{liveBmi.value} kg/m²</Badge>
                        </Box>
                    </Group>
                )}

                {/* Other computed metrics */}
                {hasMetrics && (
                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                        {metrics.bmr && (
                            <MetricCard
                                icon={<IconFlame size={12} />}
                                label="BMR"
                                value={`${metrics.bmr} kcal`}
                                hint="Basal metabolic rate"
                                color="orange"
                            />
                        )}
                        {metrics.tdee && (
                            <MetricCard
                                icon={<IconFlame size={12} />}
                                label="TDEE"
                                value={`${metrics.tdee} kcal`}
                                hint="Daily energy need"
                                color="red"
                            />
                        )}
                        {metrics.ibw && (
                            <MetricCard
                                icon={<IconScale size={12} />}
                                label="Ideal weight"
                                value={`${metrics.ibw} kg`}
                                hint="Devine formula"
                                color="teal"
                            />
                        )}
                        {metrics.lbm && (
                            <MetricCard
                                icon={<IconUser size={12} />}
                                label="Lean mass"
                                value={`${metrics.lbm} kg`}
                                hint="Boer formula"
                                color="blue"
                            />
                        )}
                        {metrics.dailyWaterL && (
                            <MetricCard
                                icon={<IconDroplet size={12} />}
                                label="Daily water"
                                value={`${metrics.dailyWaterL} L`}
                                hint="33 ml / kg body weight"
                                color="cyan"
                            />
                        )}
                        {metrics.bodyFat && (
                            <MetricCard
                                icon={<IconRuler size={12} />}
                                label="Body fat"
                                value={`${metrics.bodyFat.bodyFatPct}%`}
                                hint={`Lean: ${metrics.bodyFat.leanMassKg} kg`}
                                color="grape"
                            />
                        )}
                    </SimpleGrid>
                )}

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

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <NumberInput size="sm" label="Height (cm)" placeholder="170" min={50} max={300} {...form.getInputProps("height")} />
                    <NumberInput size="sm" label="Weight (kg)" placeholder="70" min={10} max={500} decimalScale={1} {...form.getInputProps("weight")} />
                </SimpleGrid>

                <Select
                    size="sm"
                    label="Activity level"
                    placeholder="How active are you?"
                    data={ACTIVITY_LEVEL_DATA}
                    clearable
                    {...form.getInputProps("activityLevel")}
                />

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <NumberInput size="sm" label="Waist (cm)" placeholder="80" min={30} max={200} decimalScale={1} {...form.getInputProps("waistCm")} />
                    <NumberInput size="sm" label="Neck (cm)" placeholder="38" min={20} max={80} decimalScale={1} {...form.getInputProps("neckCm")} />
                    <NumberInput size="sm" label="Hip (cm)" placeholder="95" min={40} max={200} decimalScale={1} description="Required for female body-fat" {...form.getInputProps("hipCm")} />
                </SimpleGrid>

                <Group justify="flex-end" mt={4}>
                    <Button type="submit" color="primary" loading={saving} leftSection={<IconCheck size={16} />}>
                        Save
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
    healthProfile: ProfileRecord | undefined;
    upsertProfile: {
        mutate: (data: Partial<ProfileRecord>, options?: { onSuccess?: () => void }) => void;
        isPending: boolean;
    };
}

export function HealthInfoSection({ healthProfile, upsertProfile }: Readonly<SectionProps>) {
    return (
        <Paper withBorder radius="lg" p="xl">
            <Stack gap="md">
                <SectionHeader
                    icon={<IconMapPin size={16} />}
                    title="Physical Details"
                    subtitle="Your body metrics and location, used to personalise AI assessments"
                />
                <Divider />
                <HealthInfoForm
                    key={healthProfile ? "loaded" : "loading"}
                    initial={{
                        dateOfBirth: healthProfile?.dateOfBirth ?? "",
                        sex: healthProfile?.sex ?? "",
                        height: healthProfile?.height,
                        weight: healthProfile?.weight,
                        activityLevel: healthProfile?.activityLevel ?? "",
                        waistCm: healthProfile?.waistCm,
                        neckCm: healthProfile?.neckCm,
                        hipCm: healthProfile?.hipCm,
                    }}
                    onSave={(data) => {
                        upsertProfile.mutate(
                            {
                                ...data,
                                sex: (data.sex as "male" | "female") || undefined,
                                activityLevel: (data.activityLevel as ProfileRecord["activityLevel"]) || undefined,
                            },
                            {
                                onSuccess: () => {
                                    trackEvent({ name: "profile_updated", params: { section: "health-info" } });
                                    notifications.show({
                                        title: "Saved",
                                        message: "Physical details updated.",
                                        color: colors.success,
                                        icon: <IconCheck size={16} />,
                                    });
                                },
                            },
                        );
                    }}
                    saving={upsertProfile.isPending}
                />
            </Stack>
        </Paper>
    );
}
