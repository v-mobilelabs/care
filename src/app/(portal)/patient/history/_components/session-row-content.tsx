import { Group, Badge, Box, ThemeIcon, Text, Loader, ActionIcon, Tooltip } from "@mantine/core";
import { IconCoins, IconMessage, IconClock, IconTrash } from "@tabler/icons-react";
import { useLinkStatus } from "@/ui/link";
import type { SessionSummary } from "@/app/(portal)/patient/_query";
import { agentLabel } from "../_content";
import React from "react";

// ── Time-ago helper ───────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w ago`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo ago`;
    return `${Math.floor(diffDay / 365)}y ago`;
}

// ── Token formatting ──────────────────────────────────────────────────────────

function formatTokenCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

// ── Agent badge color ─────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
    generalMedicine: "primary",
    cardiology: "red",
    mentalHealth: "violet",
    dermatology: "pink",
    pediatrics: "cyan",
    nutrition: "teal",
    prescription: "orange",
    labReport: "indigo",
    neurology: "grape",
    orthopedics: "lime",
    gastroenterology: "yellow",
    endocrinology: "blue",
};

function agentColor(agentType?: string): string {
    if (!agentType) return "primary";
    return AGENT_COLORS[agentType] ?? "gray";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SessionRowContent({ session, isPendingDelete, onDelete }: Readonly<{
    session: SessionSummary;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const { pending } = useLinkStatus();

    return (
        <Group justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <ThemeIcon size={32} radius="md" color={agentColor(session.lastAgentType)} variant="light" style={{ flexShrink: 0 }}>
                    {pending ? <Loader size={14} /> : <IconMessage size={16} />}
                </ThemeIcon>
                <Box style={{ minWidth: 0 }}>
                    <Text
                        size="sm"
                        fw={500}
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {session.title}
                    </Text>
                    <Group gap={6} mt={2}>
                        <IconClock size={11} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
                        <Text size="xs" c="dimmed" suppressHydrationWarning>{timeAgo(session.updatedAt)}</Text>
                    </Group>
                </Box>
            </Group>
            <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
                <Badge size="xs" variant="light" color={agentColor(session.lastAgentType)} radius="sm">
                    {agentLabel(session.lastAgentType)}
                </Badge>
                {session.totalUsage && session.totalUsage.totalTokens > 0 && (
                    <Tooltip label={`In: ${formatTokenCount(session.totalUsage.promptTokens)} · Out: ${formatTokenCount(session.totalUsage.completionTokens)}`} withArrow>
                        <Badge size="xs" variant="light" color="gray" radius="sm" leftSection={<IconCoins size={9} />}>
                            {formatTokenCount(session.totalUsage.totalTokens)}
                        </Badge>
                    </Tooltip>
                )}
                <Badge size="xs" variant="light" color="secondary" radius="sm">
                    {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
                </Badge>
                <ActionIcon
                    size={28}
                    variant="subtle"
                    color="danger"
                    aria-label="Delete session"
                    onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    title="Delete session"
                    disabled={isPendingDelete}
                    loading={isPendingDelete}
                >
                    <IconTrash size={13} />
                </ActionIcon>
            </Group>
        </Group>
    );
}
