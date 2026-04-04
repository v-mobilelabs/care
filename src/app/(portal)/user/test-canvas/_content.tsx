"use client";
import { MotionCard } from "@/ui/components/motion-card";
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Center,
    Chip,
    Container,
    Divider,
    Group,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconAi,
    IconChevronRight,
    IconClock,
    IconDroplet,
    IconFilter,
    IconHeartbeat,
    IconMessage,
    IconMessageSearch,
    IconMoodSmile,
    IconPill,
    IconSearch,
    IconSalad,
    IconTimeline,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import Link from "@/ui/link";
import { useLinkStatus } from "@/ui/link";
import { colors, motion } from "@/ui/tokens";

// ── Mock data ─────────────────────────────────────────────────────────────────

type AgentType =
    | "prescription"
    | "nutrition"
    | "labReport"
    | "mentalHealth"
    | "patient";

interface MockSession {
    id: string;
    title: string;
    preview: string;
    agentType: AgentType;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

const MOCK_SESSIONS: MockSession[] = [
    {
        id: "s1",
        title: "Recurring headaches and dizziness",
        preview: "I've been having headaches almost every morning for the past two weeks…",
        agentType: "prescription",
        messageCount: 12,
        createdAt: "2026-03-21T09:30:00Z",
        updatedAt: "2026-03-21T09:45:00Z",
    },
    {
        id: "s2",
        title: "Blood test results — March panel",
        preview: "Your HbA1c is within normal range at 5.2%. Cholesterol panel shows…",
        agentType: "labReport",
        messageCount: 6,
        createdAt: "2026-03-21T08:10:00Z",
        updatedAt: "2026-03-21T08:25:00Z",
    },
    {
        id: "s3",
        title: "Anxiety and sleep issues",
        preview: "Based on your responses, the GAD-7 score suggests moderate anxiety…",
        agentType: "mentalHealth",
        messageCount: 18,
        createdAt: "2026-03-20T21:00:00Z",
        updatedAt: "2026-03-20T21:30:00Z",
    },
    {
        id: "s4",
        title: "Prescription refill — Metformin",
        preview: "I've prepared a refill prescription for Metformin 500mg twice daily…",
        agentType: "prescription",
        messageCount: 4,
        createdAt: "2026-03-20T14:20:00Z",
        updatedAt: "2026-03-20T14:25:00Z",
    },
    {
        id: "s5",
        title: "7-day low-sodium meal plan",
        preview: "Here's your personalized meal plan focusing on heart-healthy options…",
        agentType: "nutrition",
        messageCount: 9,
        createdAt: "2026-03-19T10:00:00Z",
        updatedAt: "2026-03-19T10:40:00Z",
    },
    {
        id: "s6",
        title: "Lower back pain assessment",
        preview: "Let's evaluate your lower back pain. On a scale of 1-10, how would you…",
        agentType: "prescription",
        messageCount: 15,
        createdAt: "2026-03-18T16:00:00Z",
        updatedAt: "2026-03-18T16:30:00Z",
    },
    {
        id: "s7",
        title: "My current medications",
        preview: "You're currently taking 3 active medications: Metformin 500mg, Lisinopril…",
        agentType: "patient",
        messageCount: 3,
        createdAt: "2026-03-17T11:00:00Z",
        updatedAt: "2026-03-17T11:05:00Z",
    },
    {
        id: "s8",
        title: "Skin rash on forearm",
        preview: "From the image you shared, this appears to be contact dermatitis…",
        agentType: "prescription",
        messageCount: 8,
        createdAt: "2026-03-15T09:00:00Z",
        updatedAt: "2026-03-15T09:20:00Z",
    },
    {
        id: "s9",
        title: "Allergy medication options",
        preview: "For seasonal allergies, I'd recommend starting with a second-generation…",
        agentType: "prescription",
        messageCount: 7,
        createdAt: "2026-03-12T13:00:00Z",
        updatedAt: "2026-03-12T13:15:00Z",
    },
    {
        id: "s10",
        title: "Post-workout recovery nutrition",
        preview: "Based on your training intensity, here's an optimized recovery plan…",
        agentType: "nutrition",
        messageCount: 5,
        createdAt: "2026-03-05T07:30:00Z",
        updatedAt: "2026-03-05T07:45:00Z",
    },
];

// ── Agent config ──────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<AgentType, { label: string; color: string; icon: React.ReactNode }> = {
    prescription: { label: "Prescription", color: "violet", icon: <IconPill size={14} /> },
    nutrition: { label: "Nutrition", color: "teal", icon: <IconSalad size={14} /> },
    labReport: { label: "Lab Report", color: "blue", icon: <IconDroplet size={14} /> },
    mentalHealth: { label: "Mental Health", color: "pink", icon: <IconMoodSmile size={14} /> },
    patient: { label: "My Data", color: "gray", icon: <IconAi size={14} /> },
};

// ── Date helpers ──────────────────────────────────────────────────────────────

type DateGroup = "Today" | "Yesterday" | "This Week" | "This Month" | "Older";

const GROUP_ORDER: DateGroup[] = ["Today", "Yesterday", "This Week", "This Month", "Older"];

function getDateGroup(dateStr: string): DateGroup {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate();

    if (sameDay) return "Today";
    if (isYesterday) return "Yesterday";
    if (diffDays < 7) return "This Week";
    if (diffDays < 30) return "This Month";
    return "Older";
}

function relativeTime(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: Readonly<{
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}>) {
    const [hovered, setHovered] = useState(false);

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
            withBorder
            radius="lg"
            p={0}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                overflow: "hidden",
                background: `light-dark(var(--mantine-color-${color}-0), var(--mantine-color-dark-7))`,
                borderColor: `light-dark(var(--mantine-color-${color}-2), var(--mantine-color-${color}-9))`,
                transition: `box-shadow ${motion.duration.fast} ${motion.easing.standard}, transform ${motion.duration.fast} ${motion.easing.standard}`,
                boxShadow: hovered ? `0 6px 20px light-dark(var(--mantine-color-${color}-2), rgba(0,0,0,0.3))` : undefined,
                transform: hovered ? "translateY(-2px)" : undefined,
            }}
        >
            {/* Color accent bar */}
            <Box
                style={{
                    height: 3,
                    background: `var(--mantine-color-${color}-filled)`,
                }}
            />
            <Stack gap={4} p="md" align="center" ta="center">
                <ThemeIcon size={42} radius="xl" color={color} variant="light">
                    {icon}
                </ThemeIcon>
                <Text size="xl" fw={800} lh={1} c={`${color}.7`}>
                    {value}
                </Text>
                <Text size="xs" fw={500} c="dimmed" tt="uppercase" lh={1.2} style={{ letterSpacing: "0.4px" }}>
                    {label}
                </Text>
            </Stack>
        </MotionCard>
    );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCardContent({ session, onDelete }: Readonly<{
    session: MockSession;
    onDelete: () => void;
}>) {
    const { pending } = useLinkStatus();
    const agent = AGENT_CONFIG[session.agentType];

    return (
        <Box style={{ opacity: pending ? 0.7 : 1, transition: `opacity ${motion.duration.fast} ease` }}>
            <Group justify="space-between" wrap="nowrap" mb={6}>
                <Group gap={8} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <ThemeIcon
                        size={30}
                        radius="md"
                        color={agent.color}
                        variant="light"
                        style={{ flexShrink: 0 }}
                    >
                        {agent.icon}
                    </ThemeIcon>
                    <Text
                        size="sm"
                        fw={600}
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {session.title}
                    </Text>
                </Group>
                <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }} suppressHydrationWarning>
                        {relativeTime(session.updatedAt)}
                    </Text>
                    <IconChevronRight size={14} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
                </Group>
            </Group>

            <Text size="xs" c="dimmed" lineClamp={1} mb={8} pl={38}>
                {session.preview}
            </Text>

            <Group justify="space-between" wrap="nowrap" pl={38}>
                <Group gap={6}>
                    <Badge size="xs" variant="light" color={agent.color} radius="sm">
                        {agent.label}
                    </Badge>
                    <Badge size="xs" variant="light" color="gray" radius="sm" leftSection={<IconMessage size={9} />}>
                        {session.messageCount}
                    </Badge>
                </Group>
                <Tooltip label="Delete" withArrow>
                    <ActionIcon
                        size={26}
                        variant="subtle"
                        color="red"
                        aria-label="Delete session"
                        onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <IconTrash size={13} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Box>
    );
}

function SessionCard({ session, onDelete }: Readonly<{
    session: MockSession;
    onDelete: () => void;
}>) {
    const [hovered, setHovered] = useState(false);
    return (
        <Box component={Link} href={`/user/assistant?id=${session.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
            withBorder
            radius="lg"
            px="md"
            py="sm"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                cursor: "pointer",
                display: "block",
                color: "inherit",
                transition: `box-shadow ${motion.duration.fast} ${motion.easing.standard}, transform ${motion.duration.fast} ${motion.easing.standard}`,
                boxShadow: hovered ? "0 4px 16px rgba(99,102,241,0.10)" : undefined,
                transform: hovered ? "translateY(-1px)" : undefined,
            }}
        >
            <SessionCardContent session={session} onDelete={onDelete} />
        </MotionCard>
        </Box>
    );
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ label, count }: Readonly<{ label: string; count: number }>) {
    return (
        <Group gap="xs" mb="xs">
            <Text size="xs" c="dimmed" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}>
                {label}
            </Text>
            <Badge size="xs" variant="light" color="gray" radius="xl">{count}</Badge>
            <Divider style={{ flex: 1 }} />
        </Group>
    );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ value: AgentType | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "prescription", label: "Prescriptions" },
    { value: "nutrition", label: "Nutrition" },
    { value: "labReport", label: "Lab Reports" },
    { value: "mentalHealth", label: "Mental Health" },
    { value: "patient", label: "My Data" },
];

// ── Main content ──────────────────────────────────────────────────────────────

export function HistoriesContent() {
    const [query, setQuery] = useState("");
    const [agentFilter, setAgentFilter] = useState<AgentType | "all">("all");
    const [showFilters, { toggle: toggleFilters }] = useDisclosure(false);

    // Filter sessions
    const filtered = (() => {
        let result = MOCK_SESSIONS;
        if (agentFilter !== "all") {
            result = result.filter((s) => s.agentType === agentFilter);
        }
        const q = query.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (s) =>
                    s.title.toLowerCase().includes(q) ||
                    s.preview.toLowerCase().includes(q),
            );
        }
        return result;
    })();

    // Group by date
    const grouped = (() => {
        const map = new Map<DateGroup, MockSession[]>();
        for (const g of GROUP_ORDER) map.set(g, []);
        for (const s of filtered) {
            const g = getDateGroup(s.updatedAt);
            map.get(g)!.push(s);
        }
        return map;
    })();

    // Stats
    const totalSessions = MOCK_SESSIONS.length;
    const totalMessages = MOCK_SESSIONS.reduce((sum, s) => sum + s.messageCount, 0);
    const uniqueAgents = new Set(MOCK_SESSIONS.map((s) => s.agentType)).size;
    const todayCount = MOCK_SESSIONS.filter((s) => getDateGroup(s.updatedAt) === "Today").length;

    function handleDelete(id: string) {
        // Mock — no-op for now
        void id;
    }

    return (
        <Container pt="md" pb="xl">
            <Stack gap="md">
                {/* ── Header ───────────────────────────────────────── */}
                <Group justify="space-between" align="flex-end">
                    <Group gap="sm">
                        <ThemeIcon size={42} radius="xl" color="primary" variant="light">
                            <IconTimeline size={22} />
                        </ThemeIcon>
                        <Box>
                            <Title order={3} lh={1.2}>History</Title>
                            <Text size="sm" c="dimmed">Your health conversations at a glance</Text>
                        </Box>
                    </Group>
                </Group>

                {/* ── Stats ─────────────────────────────────────────── */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    <StatCard
                        icon={<IconMessage size={18} />}
                        label="Total sessions"
                        value={String(totalSessions)}
                        color="primary"
                    />
                    <StatCard
                        icon={<IconMessageSearch size={18} />}
                        label="Messages"
                        value={String(totalMessages)}
                        color="blue"
                    />
                    <StatCard
                        icon={<IconHeartbeat size={18} />}
                        label="Specialists"
                        value={String(uniqueAgents)}
                        color={colors.success}
                    />
                    <StatCard
                        icon={<IconClock size={18} />}
                        label="Today"
                        value={String(todayCount)}
                        color="violet"
                    />
                </SimpleGrid>

                {/* ── Search + Filter Card ──────────────────────────── */}
                <Card radius="xl" withBorder>
                    <Card.Section
                        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
                        px="md"
                        py="sm"
                        withBorder
                    >
                        <Group gap="sm">
                            <TextInput
                                placeholder="Search by title or content…"
                                leftSection={<IconSearch size={15} />}
                                rightSection={
                                    query ? (
                                        <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setQuery("")}>
                                            <IconX size={13} />
                                        </ActionIcon>
                                    ) : undefined
                                }
                                value={query}
                                onChange={(e) => setQuery(e.currentTarget.value)}
                                radius="md"
                                size="sm"
                                style={{ flex: 1 }}
                            />
                            <Tooltip label={showFilters ? "Hide filters" : "Show filters"} withArrow>
                                <ActionIcon
                                    size={36}
                                    variant={showFilters ? "filled" : "light"}
                                    color="primary"
                                    radius="md"
                                    onClick={toggleFilters}
                                    aria-label="Toggle filters"
                                >
                                    <IconFilter size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Card.Section>

                    {/* Filter chips */}
                    {showFilters && (
                        <Card.Section px="md" py="sm" withBorder>
                            <Chip.Group
                                multiple={false}
                                value={agentFilter}
                                onChange={(v) => setAgentFilter((v as AgentType | "all") || "all")}
                            >
                                <Group gap={6}>
                                    {FILTER_OPTIONS.map((f) => (
                                        <Chip
                                            key={f.value}
                                            value={f.value}
                                            size="xs"
                                            radius="md"
                                            variant="light"
                                            color={f.value === "all" ? "gray" : AGENT_CONFIG[f.value].color}
                                        >
                                            {f.label}
                                        </Chip>
                                    ))}
                                </Group>
                            </Chip.Group>
                        </Card.Section>
                    )}

                </Card>
                {/* Empty state */}
                {filtered.length === 0 && (
                    <Center py={60}>
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                                <IconMessageSearch size={28} />
                            </ThemeIcon>
                            <Box ta="center">
                                <Text fw={600} size="sm">
                                    {query || agentFilter !== "all"
                                        ? "No matching sessions"
                                        : "No sessions yet"}
                                </Text>
                                <Text size="xs" c="dimmed" mt={4}>
                                    {query || agentFilter !== "all"
                                        ? "Try adjusting your search or filters"
                                        : "Start a conversation with the AI assistant"}
                                </Text>
                            </Box>
                        </Stack>
                    </Center>
                )}

                {/* Grouped sessions */}
                {filtered.length > 0 && (
                    <Stack gap="lg">
                        {GROUP_ORDER.map((group) => {
                            const items = grouped.get(group);
                            if (!items || items.length === 0) return null;
                            return (
                                <Box key={group}>
                                    <GroupHeader label={group} count={items.length} />
                                    <Stack gap="sm">
                                        {items.map((s) => (
                                            <SessionCard
                                                key={s.id}
                                                session={s}
                                                onDelete={() => handleDelete(s.id)}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
