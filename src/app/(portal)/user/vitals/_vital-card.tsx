"use client";
import { MotionCard } from "@/ui/components/motion-card";
import { ActionIcon, Box, Divider, Group, Loader, Menu, Paper, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconDotsVertical, IconHeartFilled, IconTrash } from "@tabler/icons-react";
import type { VitalRecord } from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

const BP_CATEGORY_COLOR: Record<string, string> = {
    normal: colors.success,
    elevated: colors.warning,
    high_stage_1: "orange",
    high_stage_2: colors.danger,
    hypertensive_crisis: colors.danger,
};

const BP_CATEGORY_LABEL: Record<string, string> = {
    normal: "Normal",
    elevated: "Elevated",
    high_stage_1: "Stage 1",
    high_stage_2: "Stage 2",
    hypertensive_crisis: "Crisis",
};

const HR_COLOR: Record<string, string> = { low: colors.info, normal: colors.success, high: colors.warning };
const SPO2_COLOR: Record<string, string> = { normal: colors.success, low: colors.warning, critical: colors.danger };
const TEMP_COLOR: Record<string, string> = {
    low: colors.info, normal: colors.success, elevated: colors.warning, fever: "orange", high_fever: colors.danger,
};
const GLUCOSE_COLOR: Record<string, string> = {
    low: colors.info, normal: colors.success, elevated: colors.warning, high: colors.danger,
};

// ── Vital Item Card Component ─────────────────────────────────────────────────

function VitalItemCard({
    label,
    value,
    category,
    categoryColor,
}: Readonly<{
    label: string;
    value: string;
    category?: string;
    categoryColor?: string;
}>) {
    const accentColor = categoryColor || colors.success;

    return (
        <Paper
            p="md"
            radius="md"
            style={{
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
                borderLeft: `4px solid var(--mantine-color-${accentColor}-6)`,
                minHeight: "100%",
            }}
            withBorder={false}
        >
            <Stack gap={8}>
                <Text size="xs" fw={500} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>
                    {label}
                </Text>
                <Text size="xl" fw={700} style={{ lineHeight: 1 }}>
                    {value}
                </Text>
                {category && (
                    <Text size="xs" c={accentColor} fw={500}>
                        {category}
                    </Text>
                )}
            </Stack>
        </Paper>
    );
}

// ── Build vitals array helper ────────────────────────────────────────────────

function buildVitalsArray(vital: VitalRecord) {
    return [
        vital.systolicBp !== undefined && vital.diastolicBp !== undefined
            ? {
                label: "Blood Pressure",
                value: `${vital.systolicBp}/${vital.diastolicBp}`,
                category: vital.bpCategory ? BP_CATEGORY_LABEL[vital.bpCategory] : undefined,
                categoryColor: vital.bpCategory ? BP_CATEGORY_COLOR[vital.bpCategory] : colors.success,
            }
            : null,
        vital.restingHr !== undefined
            ? {
                label: "Heart Rate",
                value: `${vital.restingHr}`,
                category: vital.hrCategory && vital.hrCategory !== "normal" ? `${vital.hrCategory.toUpperCase()}` : undefined,
                categoryColor: vital.hrCategory ? HR_COLOR[vital.hrCategory] : colors.success,
            }
            : null,
        vital.spo2 !== undefined
            ? {
                label: "SpO₂",
                value: `${vital.spo2}%`,
                category: vital.spo2Category && vital.spo2Category !== "normal" ? vital.spo2Category.toUpperCase() : undefined,
                categoryColor: vital.spo2Category ? SPO2_COLOR[vital.spo2Category] : colors.success,
            }
            : null,
        vital.temperatureC !== undefined
            ? {
                label: "Temperature",
                value: `${vital.temperatureC}°C`,
                category: vital.tempCategory && vital.tempCategory !== "normal" ? vital.tempCategory.replace("_", " ").toUpperCase() : undefined,
                categoryColor: vital.tempCategory ? TEMP_COLOR[vital.tempCategory] : colors.success,
            }
            : null,
        vital.respiratoryRate !== undefined
            ? { label: "Resp. Rate", value: `${vital.respiratoryRate}`, category: undefined, categoryColor: colors.success }
            : null,
        vital.glucoseMgdl !== undefined
            ? {
                label: "Glucose",
                value: `${vital.glucoseMgdl}`,
                category: vital.glucoseCategory && vital.glucoseCategory !== "normal" ? vital.glucoseCategory.toUpperCase() : undefined,
                categoryColor: vital.glucoseCategory ? GLUCOSE_COLOR[vital.glucoseCategory] : colors.success,
            }
            : null,
        vital.weightKg !== undefined ? { label: "Weight", value: `${vital.weightKg} kg`, category: undefined, categoryColor: colors.success } : null,
        vital.heightCm !== undefined ? { label: "Height", value: `${vital.heightCm} cm`, category: undefined, categoryColor: colors.success } : null,
        vital.bmi !== undefined ? { label: "BMI", value: `${vital.bmi}`, category: undefined, categoryColor: colors.success } : null,
    ].filter(Boolean) as Array<{
        label: string;
        value: string;
        category?: string;
        categoryColor?: string;
    }>;
}

// ── Vital Card ────────────────────────────────────────────────────────────────

export function VitalCard({ vital, isPendingDelete, onDelete, isOptimistic = false }: Readonly<{
    vital: VitalRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
    isOptimistic?: boolean;
}>) {
    const vitals = buildVitalsArray(vital);

    return (
        <MotionCard
            interactive
            blobColor="var(--mantine-color-primary-6)"
            shadow="0"
            radius="lg"
            p="lg"
            withBorder={false}
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                position: isOptimistic ? "relative" as const : undefined,
            }}
        >
            {isOptimistic && (
                <Box
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 1,
                        borderRadius: "var(--mantine-radius-lg)",
                        background: "light-dark(rgba(255,255,255,0.6), rgba(30,32,40,0.6))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Loader size="sm" />
                </Box>
            )}

            {/* Header with timestamp and actions */}
            <Group justify="space-between" wrap="nowrap" gap="sm" align="center" mb="lg">
                <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <ThemeIcon size={32} radius="md" color={colors.brand} variant="light" style={{ flexShrink: 0 }}>
                        <IconHeartFilled size={18} />
                    </ThemeIcon>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} c="dimmed">
                            Vitals Record
                        </Text>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                            {formatDateTime(vital.measuredAt)} · {timeAgo(vital.measuredAt)}
                        </Text>
                    </Stack>
                </Group>
                <Menu withinPortal position="bottom-end" shadow="md" radius="md">
                    <Menu.Target>
                        <ActionIcon size={28} variant="subtle" color="gray" aria-label="Options">
                            <IconDotsVertical size={14} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
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

            <Divider mb="lg" />

            {/* Vital items grid */}
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                {vitals.map(({ label, value, category, categoryColor }) => (
                    <VitalItemCard
                        key={label}
                        label={label}
                        value={value}
                        category={category}
                        categoryColor={categoryColor}
                    />
                ))}
            </SimpleGrid>
        </MotionCard>
    );
}
