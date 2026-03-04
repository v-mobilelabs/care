"use client";
/**
 * SessionSidebar
 *
 * The accordion content for the right sidebar on the main chat page.
 * Renders Files, Conditions, SOAP Notes, and Session Details for the
 * currently active session — scoped by sessionId.
 *
 * Rendered via <RightSidebarPortal> inside ChatContent so it is only
 * visible when the user is on the /chat page.
 */

import {
    Accordion,
    ActionIcon,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import {
    IconCalendar,
    IconFile,
    IconFileExport,
    IconFileTypePdf,
    IconFileWord,
    IconFlame,
    IconFolder,
    IconHeartbeat,
    IconLayoutSidebarRightCollapse,
    IconMessageCircle,
    IconNotes,
    IconPhoto,
    IconSalad,
    IconScale,
    IconStethoscope,
} from "@tabler/icons-react";

import {
    useConditionsQuery,
    useDietPlansQuery,
    useFilesQuery,
    useSessionsQuery,
    useSoapNotesQuery,
    type ConditionRecord,
    type DietPlanRecord,
    type FileRecord,
    type SoapNoteRecord,
} from "@/app/chat/_query";
import { colors } from "@/ui/tokens";
import { printSessionSummary } from "@/app/chat/_components/print-summary";
import { useRightSidebar } from "@/app/chat/_context/right-sidebar-context";
import type { UIMessage } from "ai";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getFileIcon(mimeType: string): React.ReactNode {
    if (mimeType === "application/pdf") return <IconFileTypePdf size={14} />;
    if (mimeType.startsWith("image/")) return <IconPhoto size={14} />;
    if (mimeType.includes("word")) return <IconFileWord size={14} />;
    return <IconFile size={14} />;
}

function getFileColor(mimeType: string): string {
    if (mimeType === "application/pdf") return colors.danger;
    if (mimeType.startsWith("image/")) return "primary";
    if (mimeType.includes("word")) return "blue";
    return "gray";
}

function severityColor(severity: ConditionRecord["severity"]): string {
    if (severity === "mild") return colors.success;
    if (severity === "moderate") return colors.warning;
    if (severity === "severe") return colors.danger;
    return "red";
}

function riskColor(risk: SoapNoteRecord["riskLevel"]): string {
    if (risk === "low") return colors.success;
    if (risk === "moderate") return colors.warning;
    if (risk === "high") return colors.danger;
    return "red";
}

function SectionBadge({ count, loading }: Readonly<{ count: number; loading: boolean }>) {
    if (loading) return <Skeleton width={20} height={16} radius="sm" />;
    if (count === 0) return null;
    return (
        <Badge size="xs" variant="light" color="gray" circle>
            {count}
        </Badge>
    );
}

function EmptyState({ label }: Readonly<{ label: string }>) {
    return (
        <Text size="xs" c="dimmed" ta="center" py="sm">
            No {label} yet
        </Text>
    );
}

// ── Files section ─────────────────────────────────────────────────────────────

function FilesSection({ sessionId }: Readonly<{ sessionId: string }>) {
    const { data: allFiles = [], isLoading } = useFilesQuery();
    const files = allFiles.filter((f) => f.sessionId === sessionId);

    if (isLoading) {
        return (
            <Stack gap={6}>
                {[1, 2].map((i) => <Skeleton key={i} height={36} radius="sm" />)}
            </Stack>
        );
    }

    if (files.length === 0) return <EmptyState label="files" />;

    return (
        <Stack gap={4}>
            {files.map((file: FileRecord) => (
                <Group key={file.id} gap={8} wrap="nowrap">
                    <ThemeIcon size={28} variant="light" color={getFileColor(file.mimeType)} radius="sm" style={{ flexShrink: 0 }}>
                        {getFileIcon(file.mimeType)}
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Tooltip label={file.name} withArrow position="right" openDelay={400}>
                            <Text size="xs" fw={500} truncate>{file.name}</Text>
                        </Tooltip>
                        <Text size="xs" c="dimmed">{formatBytes(file.size)}</Text>
                    </Box>
                </Group>
            ))}
        </Stack>
    );
}

// ── Conditions section ────────────────────────────────────────────────────────

function ConditionsSection({ sessionId }: Readonly<{ sessionId: string }>) {
    const { data: allConditions = [], isLoading } = useConditionsQuery();
    const conditions = allConditions.filter((c) => c.sessionId === sessionId);

    if (isLoading) {
        return (
            <Stack gap={6}>
                {[1, 2].map((i) => <Skeleton key={i} height={40} radius="sm" />)}
            </Stack>
        );
    }

    if (conditions.length === 0) return <EmptyState label="conditions" />;

    return (
        <Stack gap={6}>
            {conditions.map((cond: ConditionRecord) => (
                <Box
                    key={cond.id}
                    p={8}
                    style={(theme) => ({
                        borderRadius: theme.radius.sm,
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                        border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    })}
                >
                    <Group gap={6} mb={2} wrap="nowrap">
                        <Text size="xs" fw={600} style={{ flex: 1, minWidth: 0 }} truncate>
                            {cond.name}
                        </Text>
                        {cond.icd10 && (
                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                                {cond.icd10}
                            </Text>
                        )}
                    </Group>
                    <Group gap={4} wrap="wrap">
                        <Badge size="xs" variant="light" color={severityColor(cond.severity)}>{cond.severity}</Badge>
                        <Badge size="xs" variant="outline" color="gray">{cond.status}</Badge>
                    </Group>
                </Box>
            ))}
        </Stack>
    );
}

// ── SOAP notes section ────────────────────────────────────────────────────────

function SoapNotesSection({ sessionId }: Readonly<{ sessionId: string }>) {
    const { data: allNotes = [], isLoading } = useSoapNotesQuery();
    const notes = allNotes.filter((n) => n.sessionId === sessionId);

    if (isLoading) {
        return (
            <Stack gap={6}>
                {[1, 2].map((i) => <Skeleton key={i} height={44} radius="sm" />)}
            </Stack>
        );
    }

    if (notes.length === 0) return <EmptyState label="SOAP notes" />;

    return (
        <Stack gap={6}>
            {notes.map((note: SoapNoteRecord) => (
                <Box
                    key={note.id}
                    p={8}
                    style={(theme) => ({
                        borderRadius: theme.radius.sm,
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                        border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    })}
                >
                    <Text size="xs" fw={600} truncate mb={2}>{note.condition}</Text>
                    <Group gap={4}>
                        <Badge size="xs" variant="light" color={riskColor(note.riskLevel)}>
                            {note.riskLevel} risk
                        </Badge>
                        <Text size="xs" c="dimmed">{formatDate(note.createdAt)}</Text>
                    </Group>
                </Box>
            ))}
        </Stack>
    );
}

// ── Diet Plan section ─────────────────────────────────────────────────────────

function DietPlanSection({ sessionId }: Readonly<{ sessionId: string }>) {
    const { data: allPlans = [], isLoading } = useDietPlansQuery();
    const plan: DietPlanRecord | undefined = allPlans.find((p) => p.sessionId === sessionId);

    if (isLoading) {
        return (
            <Stack gap={6}>
                <Skeleton height={20} radius="sm" />
                <Skeleton height={14} radius="sm" width="70%" />
                <Skeleton height={14} radius="sm" />
            </Stack>
        );
    }

    if (!plan) return <EmptyState label="diet plan" />;

    return (
        <Box
            p={8}
            style={(theme) => ({
                borderRadius: theme.radius.sm,
                background: "light-dark(var(--mantine-color-green-0), rgba(0,0,0,0.15))",
                border: "1px solid light-dark(var(--mantine-color-green-2), var(--mantine-color-dark-5))",
            })}
        >
            <Text size="xs" fw={600} truncate mb={4}>{plan.condition}</Text>
            <Group gap={4} mb={6} wrap="wrap">
                {plan.weeklyWeightLossEstimate && (
                    <Badge size="xs" color="green" variant="filled" radius="sm" leftSection={<IconScale size={9} />}>
                        {plan.weeklyWeightLossEstimate}
                    </Badge>
                )}
                {plan.totalDailyCalories != null && plan.totalDailyCalories > 0 && (
                    <Badge size="xs" color="orange" variant="light" radius="sm" leftSection={<IconFlame size={9} />}>
                        {plan.totalDailyCalories} kcal/day
                    </Badge>
                )}
            </Group>
            <Text size="xs" c="dimmed" lineClamp={2} lh={1.5}>{plan.overview}</Text>
        </Box>
    );
}

// ── Session details section ───────────────────────────────────────────────────

function SessionDetailsSection({ sessionId }: Readonly<{ sessionId: string }>) {
    const { data: sessions = [], isLoading } = useSessionsQuery();
    const session = sessions.find((s) => s.id === sessionId);

    if (isLoading) {
        return (
            <Stack gap={6}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height={20} radius="sm" />)}
            </Stack>
        );
    }

    if (!session) return <EmptyState label="session info" />;

    return (
        <Stack gap={8}>
            <Box>
                <Text size="xs" c="dimmed" mb={2}>Title</Text>
                <Text size="xs" fw={500}>{session.title}</Text>
            </Box>
            <Group gap={6} align="center">
                <IconMessageCircle size={13} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Text size="xs" c="dimmed">{session.messageCount} messages</Text>
            </Group>
            <Group gap={6} align="center">
                <IconCalendar size={13} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Text size="xs" c="dimmed">Started {formatDate(session.createdAt)}</Text>
            </Group>
            <Group gap={6} align="center">
                <IconCalendar size={13} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Text size="xs" c="dimmed">Updated {formatDate(session.updatedAt)}</Text>
            </Group>
        </Stack>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface SessionSidebarProps {
    sessionId: string;
    messages: UIMessage[];
}

export function SessionSidebar({ sessionId, messages }: Readonly<SessionSidebarProps>) {
    const { toggleRight } = useRightSidebar();
    const { data: allFiles = [], isLoading: filesLoading } = useFilesQuery();
    const { data: allConditions = [], isLoading: conditionsLoading } = useConditionsQuery();
    const { data: allNotes = [], isLoading: notesLoading } = useSoapNotesQuery();
    const { data: allPlans = [], isLoading: plansLoading } = useDietPlansQuery();

    const filesCount = allFiles.filter((f) => f.sessionId === sessionId).length;
    const conditionsCount = allConditions.filter((c) => c.sessionId === sessionId).length;
    const notesCount = allNotes.filter((n) => n.sessionId === sessionId).length;
    const hasDietPlan = allPlans.some((p) => p.sessionId === sessionId);

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header — matches chat header padding/height */}
            <Box px="lg" py="sm" style={{ flexShrink: 0 }}>
                <Group justify="space-between" align="center">
                    <Text size="sm" fw={600}>Session Panel</Text>
                    <ActionIcon variant="subtle" color="gray" hiddenFrom="md" aria-label="Close panel" onClick={toggleRight}>
                        <IconLayoutSidebarRightCollapse size={20} />
                    </ActionIcon>
                </Group>
            </Box>
            <Divider />
            <ScrollArea h="100%" type="hover" scrollbarSize={4}>
                <Accordion
                    multiple
                    defaultValue={["session-details", "files", "conditions", "soap-notes", "diet-plan"]}
                    styles={{
                        item: { border: "none" },
                        control: { paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14 },
                        panel: { paddingLeft: 14, paddingRight: 14, paddingBottom: 12 },
                        label: { fontSize: "var(--mantine-font-size-xs)", fontWeight: 600 },
                        chevron: { width: 16, height: 16 },
                    }}
                >
                    <Accordion.Item value="session-details">
                        <Accordion.Control
                            icon={
                                <ThemeIcon size={20} variant="light" color="primary" radius="sm">
                                    <IconStethoscope size={12} />
                                </ThemeIcon>
                            }
                        >
                            <Text size="xs" fw={600}>Session Details</Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <SessionDetailsSection sessionId={sessionId} />
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="files">
                        <Accordion.Control
                            icon={
                                <ThemeIcon size={20} variant="light" color="blue" radius="sm">
                                    <IconFolder size={12} />
                                </ThemeIcon>
                            }
                        >
                            <Group gap={6} wrap="nowrap">
                                <Text size="xs" fw={600}>Files</Text>
                                <SectionBadge count={filesCount} loading={filesLoading} />
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <FilesSection sessionId={sessionId} />
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="conditions">
                        <Accordion.Control
                            icon={
                                <ThemeIcon size={20} variant="light" color={colors.warning} radius="sm">
                                    <IconHeartbeat size={12} />
                                </ThemeIcon>
                            }
                        >
                            <Group gap={6} wrap="nowrap">
                                <Text size="xs" fw={600}>Conditions</Text>
                                <SectionBadge count={conditionsCount} loading={conditionsLoading} />
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <ConditionsSection sessionId={sessionId} />
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="soap-notes">
                        <Accordion.Control
                            icon={
                                <ThemeIcon size={20} variant="light" color={colors.success} radius="sm">
                                    <IconNotes size={12} />
                                </ThemeIcon>
                            }
                        >
                            <Group gap={6} wrap="nowrap">
                                <Text size="xs" fw={600}>SOAP Notes</Text>
                                <SectionBadge count={notesCount} loading={notesLoading} />
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <SoapNotesSection sessionId={sessionId} />
                        </Accordion.Panel>
                    </Accordion.Item>

                    {hasDietPlan && (
                        <Accordion.Item value="diet-plan">
                            <Accordion.Control
                                icon={
                                    <ThemeIcon size={20} variant="light" color="green" radius="sm">
                                        <IconSalad size={12} />
                                    </ThemeIcon>
                                }
                            >
                                <Group gap={6} wrap="nowrap">
                                    <Text size="xs" fw={600}>Diet Plan</Text>
                                    {plansLoading ? (
                                        <Skeleton width={20} height={16} radius="sm" />
                                    ) : (
                                        <Badge size="xs" variant="light" color="green" circle>1</Badge>
                                    )}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <DietPlanSection sessionId={sessionId} />
                            </Accordion.Panel>
                        </Accordion.Item>
                    )}
                </Accordion>
            </ScrollArea>
            {messages.length > 1 && (
                <>
                    <Divider />
                    <Box px={14} py={10} style={{ flexShrink: 0 }}>
                        <Button
                            fullWidth
                            variant="light"
                            color="gray"
                            size="sm"
                            leftSection={<IconFileExport size={15} />}
                            onClick={() => printSessionSummary(messages)}
                        >
                            Export Session Summary
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
}
