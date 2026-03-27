"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Collapse,
    Divider,
    Group,
    Loader,
    Menu,
    Paper,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconChevronDown,
    IconChevronRight,
    IconDotsVertical,
    IconHeartFilled,
    IconTrash,
} from "@tabler/icons-react";
import type { VitalRecord } from "@/app/(portal)/user/_query";

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
    normal: "teal",
    elevated: "yellow",
    high_stage_1: "orange",
    high_stage_2: "red",
    hypertensive_crisis: "red",
};

const BP_CATEGORY_LABEL: Record<string, string> = {
    normal: "Normal",
    elevated: "Elevated",
    high_stage_1: "Stage 1",
    high_stage_2: "Stage 2",
    hypertensive_crisis: "Crisis",
};

const HR_COLOR: Record<string, string> = { low: "blue", normal: "teal", high: "orange" };
const SPO2_COLOR: Record<string, string> = { normal: "teal", low: "orange", critical: "red" };
const TEMP_COLOR: Record<string, string> = {
    low: "blue", normal: "teal", elevated: "yellow", fever: "orange", high_fever: "red",
};
const GLUCOSE_COLOR: Record<string, string> = {
    low: "blue", normal: "teal", elevated: "yellow", high: "red",
};

function categoryBadge(label: string, color: string) {
    return (
        <Badge size="xs" variant="light" color={color} radius="sm">
            {label}
        </Badge>
    );
}

/** Pick the most relevant vital to show as the primary indicator. */
function primaryLabel(v: VitalRecord): string {
    if (v.systolicBp !== undefined && v.diastolicBp !== undefined) {
        return `${v.systolicBp}/${v.diastolicBp} mmHg`;
    }
    if (v.restingHr !== undefined) return `${v.restingHr} bpm`;
    if (v.spo2 !== undefined) return `${v.spo2}% SpO2`;
    if (v.temperatureC !== undefined) return `${v.temperatureC}°C`;
    if (v.glucoseMgdl !== undefined) return `${v.glucoseMgdl} mg/dL`;
    if (v.weightKg !== undefined) return `${v.weightKg} kg`;
    return "Vitals";
}

// ── Vital Card ────────────────────────────────────────────────────────────────

export function VitalCard({ vital, isPendingDelete, onDelete, isOptimistic = false }: Readonly<{
    vital: VitalRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
    isOptimistic?: boolean;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);

    const details = [
        vital.systolicBp !== undefined && vital.diastolicBp !== undefined
            ? { label: "Blood Pressure", value: `${vital.systolicBp}/${vital.diastolicBp} mmHg` }
            : null,
        vital.restingHr !== undefined ? { label: "Heart Rate", value: `${vital.restingHr} bpm` } : null,
        vital.spo2 !== undefined ? { label: "SpO2", value: `${vital.spo2}%` } : null,
        vital.temperatureC !== undefined ? { label: "Temperature", value: `${vital.temperatureC}°C` } : null,
        vital.respiratoryRate !== undefined ? { label: "Resp. Rate", value: `${vital.respiratoryRate} breaths/min` } : null,
        vital.glucoseMgdl !== undefined ? { label: "Glucose", value: `${vital.glucoseMgdl} mg/dL` } : null,
        vital.weightKg !== undefined ? { label: "Weight", value: `${vital.weightKg} kg` } : null,
        vital.heightCm !== undefined ? { label: "Height", value: `${vital.heightCm} cm` } : null,
        vital.bmi !== undefined ? { label: "BMI", value: `${vital.bmi}` } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    const hasDetails = details.length > 1;

    return (
        <Paper
            shadow="0"
            radius="lg"
            px="md"
            py="md"
            withBorder={false}
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                backgroundColor: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-7))",
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
            <Group justify="space-between" wrap="nowrap" gap="sm" align="center">
                {/* Left: icon + primary reading + badges */}
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color="red"
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconHeartFilled size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} lineClamp={1}>{primaryLabel(vital)}</Text>
                        <Group gap={6} mt={0} wrap="wrap">
                            {vital.bpCategory && categoryBadge(
                                BP_CATEGORY_LABEL[vital.bpCategory] ?? vital.bpCategory,
                                BP_CATEGORY_COLOR[vital.bpCategory] ?? "gray",
                            )}
                            {vital.hrCategory && vital.hrCategory !== "normal" && categoryBadge(
                                `HR ${vital.hrCategory}`,
                                HR_COLOR[vital.hrCategory] ?? "gray",
                            )}
                            {vital.spo2Category && vital.spo2Category !== "normal" && categoryBadge(
                                `SpO2 ${vital.spo2Category}`,
                                SPO2_COLOR[vital.spo2Category] ?? "gray",
                            )}
                            {vital.tempCategory && vital.tempCategory !== "normal" && categoryBadge(
                                vital.tempCategory.replace("_", " "),
                                TEMP_COLOR[vital.tempCategory] ?? "gray",
                            )}
                            {vital.glucoseCategory && vital.glucoseCategory !== "normal" && categoryBadge(
                                `Glucose ${vital.glucoseCategory}`,
                                GLUCOSE_COLOR[vital.glucoseCategory] ?? "gray",
                            )}
                            {vital.bmi !== undefined && (
                                <Text size="xs" c="dimmed">BMI {vital.bmi}</Text>
                            )}
                            <Text size="xs" c="dimmed">{formatDateTime(vital.measuredAt)} · {timeAgo(vital.measuredAt)}</Text>
                        </Group>
                    </Box>
                </Group>

                {/* Right: expand + actions */}
                <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
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
                        {details.map(({ label, value }) => (
                            <Group key={label} gap={8}>
                                <Text size="xs" fw={600} c="dimmed" w={100} style={{ flexShrink: 0 }}>
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
