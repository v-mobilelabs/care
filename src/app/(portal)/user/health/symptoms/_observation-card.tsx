"use client";
import { MotionCard } from "@/ui/components/motion-card";
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Collapse,
    Divider,
    Group,
    Loader,
    Menu,
    RingProgress,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconAlertTriangle,
    IconActivityHeartbeat,
    IconChevronDown,
    IconChevronRight,
    IconDotsVertical,
    IconInfoCircle,
    IconMinus,
    IconStethoscope,
    IconTrendingDown,
    IconTrendingUp,
    IconTrash,
} from "@tabler/icons-react";
import Link from "@/ui/link";
import type {
    SymptomObservationRecord,
    SymptomObservationState,
    SymptomObservationSource,
} from "@/ui/ai/query";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
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

// ── Severity helpers ──────────────────────────────────────────────────────────

function severityColor(severity: number): string {
    if (severity <= 3) return "teal";
    if (severity <= 5) return "yellow";
    if (severity <= 7) return "orange";
    return "red";
}

function severityLabel(severity: number): string {
    if (severity <= 3) return "Mild";
    if (severity <= 5) return "Moderate";
    if (severity <= 7) return "Significant";
    return "Severe";
}

// ── Trend badge ───────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<
    SymptomObservationState,
    { color: string; label: string; Icon: React.ElementType }
> = {
    improving: { color: "teal", label: "Improving", Icon: IconTrendingUp },
    stable: { color: "blue", label: "Stable", Icon: IconMinus },
    worsening: { color: "red", label: "Worsening", Icon: IconTrendingDown },
};

function StateBadge({ state }: Readonly<{ state: SymptomObservationState }>) {
    const { color, label, Icon } = STATE_CONFIG[state];
    return (
        <Badge
            size="xs"
            variant="light"
            color={color}
            radius="sm"
            leftSection={<Icon size={10} />}
        >
            {label}
        </Badge>
    );
}

// ── Source badge ──────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
    SymptomObservationSource,
    { color: string; label: string }
> = {
    chat: { color: "blue", label: "AI Chat" },
    assessment: { color: "grape", label: "Assessment" },
    "doctor-note": { color: "indigo", label: "Doctor" },
    manual: { color: "gray", label: "Manual" },
    migration: { color: "gray", label: "Imported" },
};

function resolveSourceHref(observation: SymptomObservationRecord): string | undefined {
    if (observation.source === "assessment" && observation.assessmentId) {
        return `/user/health/assessments/${observation.assessmentId}`;
    }

    if (observation.source === "chat" && observation.sessionId) {
        return `/user/assistant?id=${observation.sessionId}`;
    }

    return undefined;
}

function SourceBadge({ observation }: Readonly<{ observation: SymptomObservationRecord }>) {
    const { source } = observation;
    const { color, label } = SOURCE_CONFIG[source];
    const href = resolveSourceHref(observation);

    if (href) {
        return (
            <Tooltip label="View source" withArrow>
                <Badge
                    component={Link}
                    href={href}
                    size="xs"
                    variant="dot"
                    color={color}
                    radius="sm"
                    aria-label={`Open ${label} source`}
                >
                    {label}
                </Badge>
            </Tooltip>
        );
    }

    return (
        <Badge size="xs" variant="dot" color={color} radius="sm">
            {label}
        </Badge>
    );
}

// ── Red-flag escalation ───────────────────────────────────────────────────────

function RedFlagAlert({
    severity,
    state,
}: Readonly<{ severity?: number; state?: SymptomObservationState }>) {
    const isHighSeverity = severity !== undefined && severity >= 8;
    const isWorsening = state === "worsening";

    if (isHighSeverity && isWorsening) {
        return (
            <Alert
                icon={<IconAlertTriangle size={16} />}
                color="red"
                variant="light"
                radius="sm"
                styles={{ body: { gap: 4 } }}
                py={8}
                px="sm"
            >
                <Text size="xs" fw={600}>High-severity worsening symptom</Text>
                <Text size="xs" c="dimmed">
                    Please contact your doctor or seek urgent care if you feel unwell.
                </Text>
            </Alert>
        );
    }

    if (isHighSeverity) {
        return (
            <Alert
                icon={<IconInfoCircle size={16} />}
                color="orange"
                variant="light"
                radius="sm"
                styles={{ body: { gap: 4 } }}
                py={8}
                px="sm"
            >
                <Text size="xs" fw={600}>Severe symptom reported</Text>
                <Text size="xs" c="dimmed">
                    Consider discussing this with your doctor at your next visit.
                </Text>
            </Alert>
        );
    }

    return null;
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
    label,
    value,
}: Readonly<{ label: string; value: string }>) {
    return (
        <Group gap={6} wrap="nowrap" align="flex-start">
            <Text size="xs" c="dimmed" style={{ minWidth: 80, flexShrink: 0 }}>
                {label}
            </Text>
            <Text size="xs" style={{ wordBreak: "break-word" }}>
                {value}
            </Text>
        </Group>
    );
}

// ── Card header ───────────────────────────────────────────────────────────────

function CardHeader({
    observation,
    hasDetails,
    expanded,
    isPendingDelete,
    onToggle,
    onDelete,
}: Readonly<{
    observation: SymptomObservationRecord;
    hasDetails: boolean;
    expanded: boolean;
    isPendingDelete?: boolean;
    onToggle: () => void;
    onDelete: (id: string) => void;
}>) {
    const severity = observation.severity;
    const hasSeverity = typeof severity === "number";
    const svColor = hasSeverity ? severityColor(severity) : "gray";

    return (
        <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap="sm" wrap="nowrap" style={{ flex: 1, overflow: "hidden" }}>
                {(() => {
                    if (hasSeverity) {
                        return (
                            <Tooltip
                                label={`Severity ${severity}/10 — ${severityLabel(severity)}`}
                                withArrow
                            >
                                <Box style={{ flexShrink: 0 }}>
                                    <RingProgress
                                        size={44}
                                        thickness={4}
                                        roundCaps
                                        sections={[{ value: severity * 10, color: svColor }]}
                                        label={
                                            <Text size="10px" fw={700} ta="center" c={svColor} lh={1}>
                                                {severity}
                                            </Text>
                                        }
                                    />
                                </Box>
                            </Tooltip>
                        );
                    }

                    return (
                        <ThemeIcon size={40} radius="xl" color="gray" variant="light">
                            <IconActivityHeartbeat size={18} />
                        </ThemeIcon>
                    );
                })()}
                <Box style={{ overflow: "hidden" }}>
                    <Text fw={600} size="sm" truncate>{observation.symptom}</Text>
                    <Group gap={4} mt={2} wrap="wrap">
                        {observation.state && <StateBadge state={observation.state} />}
                        <SourceBadge observation={observation} />
                    </Group>
                </Box>
            </Group>

            <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                <Box ta="right">
                    <Text size="xs" c="dimmed">{formatDateTime(observation.observedAt)}</Text>
                    <Text size="10px" c="dimmed">{timeAgo(observation.observedAt)}</Text>
                </Box>
                {hasDetails && (
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={onToggle}
                        aria-label={expanded ? "Collapse details" : "Expand details"}
                    >
                        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </ActionIcon>
                )}
                <Menu shadow="md" position="bottom-end" withArrow>
                    <Menu.Target>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            aria-label="More options"
                            loading={isPendingDelete}
                        >
                            {isPendingDelete
                                ? <Loader size={12} />
                                : <IconDotsVertical size={14} />
                            }
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => onDelete(observation.id)}
                        >
                            Delete observation
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Group>
    );
}

// ── Expanded details panel ────────────────────────────────────────────────────

function ExpandedDetails({
    observation,
}: Readonly<{ observation: SymptomObservationRecord }>) {
    return (
        <Stack gap={6} pt={4}>
            {observation.onset && (
                <DetailRow label="Onset" value={observation.onset} />
            )}
            {observation.duration && (
                <DetailRow label="Duration" value={observation.duration} />
            )}
            {observation.triggers && observation.triggers.length > 0 && (
                <DetailRow label="Triggers" value={observation.triggers.join(", ")} />
            )}
            {observation.alleviators && observation.alleviators.length > 0 && (
                <DetailRow label="Alleviators" value={observation.alleviators.join(", ")} />
            )}
            {observation.associatedSymptoms && observation.associatedSymptoms.length > 0 && (
                <DetailRow
                    label="Associated"
                    value={observation.associatedSymptoms.join(", ")}
                />
            )}
            {observation.notes && (
                <DetailRow label="Notes" value={observation.notes} />
            )}
            {observation.assessmentId && (
                <Group gap={4}>
                    <IconStethoscope size={11} color="var(--mantine-color-dimmed)" />
                    <Text size="10px" c="dimmed">Sourced from assessment</Text>
                </Group>
            )}
        </Stack>
    );
}

// ── Observation Card ──────────────────────────────────────────────────────────

export function ObservationCard({
    observation,
    isPendingDelete,
    onDelete,
    isOptimistic = false,
}: Readonly<{
    observation: SymptomObservationRecord;
    isPendingDelete?: boolean;
    onDelete: (id: string) => void;
    isOptimistic?: boolean;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const hasDetails = Boolean(
        observation.onset ||
        observation.duration ||
        (observation.triggers?.length ?? 0) > 0 ||
        (observation.alleviators?.length ?? 0) > 0 ||
        (observation.associatedSymptoms?.length ?? 0) > 0 ||
        observation.notes,
    );

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
            withBorder
            radius="lg"
            p="md"
            style={{
                opacity: isPendingDelete || isOptimistic ? 0.6 : 1,
                transition: "opacity 0.2s ease",
            }}
        >
            <Stack gap="xs">
                <CardHeader
                    observation={observation}
                    hasDetails={hasDetails}
                    expanded={expanded}
                    isPendingDelete={isPendingDelete}
                    onToggle={toggle}
                    onDelete={onDelete}
                />
                <RedFlagAlert severity={observation.severity} state={observation.state} />
                {hasDetails && (
                    <Collapse in={expanded}>
                        <Divider my={4} />
                        <ExpandedDetails observation={observation} />
                    </Collapse>
                )}
            </Stack>
        </MotionCard>
    );
}
