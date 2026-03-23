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
    Switch,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconChevronDown,
    IconChevronRight,
    IconDotsVertical,
    IconEdit,
    IconPillFilled,
    IconPrescription,
    IconTrash,
} from "@tabler/icons-react";
import { type MedicationRecord, type MedicationStatus } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { formatDate } from "@/lib/format";

const STATUS_COLOR: Record<MedicationStatus, string> = {
    active: colors.success,
    completed: "blue",
    discontinued: "gray",
    paused: colors.warning,
};

const STATUS_LABEL: Record<MedicationStatus, string> = {
    active: "Active",
    completed: "Completed",
    discontinued: "Discontinued",
    paused: "Paused",
};

// ── Medication Card ───────────────────────────────────────────────────────────

export function MedicationCard({ med, onEdit, isPendingDelete, onDelete, onToggleStatus, isTogglingStatus, isOptimistic = false }: Readonly<{
    med: MedicationRecord;
    onEdit: () => void;
    isPendingDelete: boolean;
    onDelete: () => void;
    onToggleStatus: () => void;
    isTogglingStatus: boolean;
    isOptimistic?: boolean;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const statusColor = STATUS_COLOR[med.status];
    const hasDetails = !!(med.dosage ?? med.form ?? med.frequency ?? med.duration ?? med.condition);

    const statusBorderColor = (() => {
        if (statusColor === colors.success) return "teal";
        if (statusColor === colors.warning) return "yellow";
        return statusColor;
    })();

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
                {/* Left: icon + name + badges */}
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color="violet"
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconPillFilled size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text size="sm" lineClamp={2}>{med.name}</Text>
                        <Group gap={6} mt={0} wrap="wrap">
                            <Badge size="xs" variant="light" color={statusColor} radius="sm">
                                {STATUS_LABEL[med.status]}
                            </Badge>
                            {med.dosage && (
                                <Text size="xs" c="dimmed">{med.dosage}</Text>
                            )}
                            {med.frequency && (
                                <Text size="xs" c="dimmed">· {med.frequency}</Text>
                            )}
                            {med.condition && (
                                <Badge size="xs" variant="outline" color="gray" radius="sm">
                                    {med.condition}
                                </Badge>
                            )}
                            {med.prescriptionId && (
                                <Badge
                                    size="xs"
                                    variant="light"
                                    color="indigo"
                                    radius="sm"
                                    leftSection={<IconPrescription size={10} />}
                                >
                                    Prescription
                                </Badge>
                            )}
                            <Text size="xs" c="dimmed">{formatDate(med.createdAt)}</Text>
                        </Group>
                    </Box>
                </Group>

                {/* Right: toggle + actions */}
                <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                    {(med.status === "active" || med.status === "paused") && (
                        <Switch
                            size="xs"
                            color={colors.success}
                            checked={med.status === "active"}
                            onChange={onToggleStatus}
                            disabled={isTogglingStatus}
                            aria-label={med.status === "active" ? "Pause medication" : "Resume medication"}
                        />
                    )}
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
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                                Edit
                            </Menu.Item>
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
                        {[
                            { label: "Dosage", value: med.dosage },
                            { label: "Form", value: med.form },
                            { label: "Frequency", value: med.frequency },
                            { label: "Duration", value: med.duration },
                            { label: "For", value: med.condition },
                        ]
                            .filter((f) => !!f.value)
                            .map(({ label, value }) => (
                                <Group key={label} gap={8}>
                                    <Text size="xs" fw={600} c="dimmed" w={80} style={{ flexShrink: 0 }}>
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
