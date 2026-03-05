"use client";
import {
    ActionIcon,
    AppShell,
    Box,
    Divider,
    Group,
    NavLink,
    ScrollArea,
    Select,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
    UnstyledButton,
    useComputedColorScheme,
    useMantineColorScheme,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
    IconCapsule,
    IconChevronDown,
    IconClipboardHeart,
    IconClipboardList,
    IconGauge,
    IconHeartbeat,
    IconFolder,
    IconHistory,
    IconMessage,
    IconNotes,
    IconQuestionMark,
    IconSalad,
    IconShield,
    IconStethoscope,
    IconMoon,
    IconPhone,
    IconSun,
    IconTrash,
    IconUser,
    IconUsers,
    IconVideo,
    IconX,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
    useSessionsQuery,
    useDeleteSessionMutation,
    useDependentsQuery,
} from "@/app/chat/_query";
import { useActiveProfile } from "@/app/chat/_context/active-profile-context";
import { version } from "../../../../package.json";



interface SidebarProps {
    sessionId: string;
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
    onCloseMobile: () => void;
}

const navItemStyle = { borderRadius: 8, paddingTop: 8, paddingBottom: 8 };

interface NavGridItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

function NavGridItem({ icon, label, active, onClick }: Readonly<NavGridItemProps>) {
    const [hovered, setHovered] = useState(false);
    return (
        <UnstyledButton
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 4px",
                borderRadius: 10,
                textAlign: "center",
                background: active
                    ? "light-dark(var(--mantine-color-primary-0), rgba(99,102,241,0.15))"
                    : hovered
                        ? "light-dark(var(--mantine-color-gray-1), rgba(255,255,255,0.06))"
                        : "transparent",
                color: active
                    ? "var(--mantine-color-primary-6)"
                    : hovered
                        ? "light-dark(var(--mantine-color-gray-8), var(--mantine-color-gray-2))"
                        : "var(--mantine-color-dimmed)",
                transform: hovered && !active ? "translateY(-1px)" : "none",
                transition: "background 150ms ease, color 150ms ease, transform 150ms ease",
            }}
        >
            {icon}
            <Text size="10px" fw={active ? 600 : 400} lh={1.2} style={{ wordBreak: "break-word" }}>
                {label}
            </Text>
        </UnstyledButton>
    );
}
const sectionLabelStyle: React.CSSProperties = {
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--mantine-color-dimmed)",
    padding: "4px 8px 2px",
};

export function Sidebar({ sessionId, onNewChat, onSelectSession, onCloseMobile }: Readonly<SidebarProps>) {
    const { data: sessions = [], isLoading: sessionsLoading } = useSessionsQuery();
    const deleteSession = useDeleteSessionMutation();
    const { data: dependents = [] } = useDependentsQuery();
    const { activeDependentId, switchProfile } = useActiveProfile();
    const pathname = usePathname();
    const router = useRouter();
    const [, startNavTransition] = useTransition();
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });

    const profileOptions = [
        { value: "__self__", label: "My Profile", icon: <IconUser size={16} /> },
        ...dependents.map((d) => ({
            value: d.id,
            label: [d.firstName, d.lastName].filter(Boolean).join(" "),
            icon: <IconUsers size={16} />,
        })),
    ];

    function nav(href: string) {
        startNavTransition(() => { router.push(href); });
        onCloseMobile();
    }

    function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();

        function onDeleteSuccess() {
            if (id !== sessionId) return;
            const next = sessions.find((s) => s.id !== id);
            if (next) {
                onSelectSession(next.id);
            } else {
                onNewChat();
            }
        }

        modals.openConfirmModal({
            title: "Delete session?",
            children: <Text size="sm">This will permanently remove this session from your history. This cannot be undone.</Text>,
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteSession.mutate(id, { onSuccess: onDeleteSuccess });
            },
        });
    }

    return (
        <AppShell.Navbar
            style={{
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid light-dark(var(--mantine-color-gray-2), rgba(255,255,255,0.06))",
                background: "light-dark(var(--mantine-color-white), #171717)",
                overflow: "hidden",
            }}
        >
            {/* Brand */}
            <Box
                px="md"
                pt="md"
                pb="xs"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), rgba(255,255,255,0.06))",
                }}
            >
                <Group justify="space-between" mb="sm">
                    <Group gap={10}>
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconHeartbeat size={20} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={700} size="md" lh={1.2}>CareAI</Text>
                            <Text size="sm" c="dimmed" lh={1.2}>Clinical Assessment</Text>
                        </Box>
                    </Group>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="md"
                        hiddenFrom="sm"
                        onClick={onCloseMobile}
                        aria-label="Close menu"
                    >
                        <IconX size={18} />
                    </ActionIcon>
                </Group>
            </Box>

            {/* Profile switcher */}
            <Box
                px="md"
                pt="sm"
                pb="sm"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), rgba(255,255,255,0.06))",
                }}
            >
                <Select
                    size="sm"
                    value={activeDependentId ?? "__self__"}
                    onChange={(v) => {
                        const id = v === "__self__" ? undefined : (v ?? undefined);
                        const label = profileOptions.find((o) => o.value === (v ?? "__self__"))?.label ?? "My Profile";
                        switchProfile(id, label);
                        onNewChat();
                    }}
                    data={profileOptions.map(({ value, label }) => ({ value, label }))}
                    leftSection={<IconChevronDown size={14} />}
                    styles={{ input: { fontWeight: 600 } }}
                    comboboxProps={{ withinPortal: false }}
                    aria-label="Switch profile"
                />
            </Box>

            {/* Session history — grows to fill all available space, scrolls independently */}
            <Box
                px={6}
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), rgba(255,255,255,0.06))",
                }}
            >
                <Box px={2} pt="sm" pb={4} style={{ flexShrink: 0 }}>
                    <Text style={sectionLabelStyle}>History</Text>
                </Box>
                <ScrollArea style={{ flex: 1 }}>
                    {(() => {
                        if (sessionsLoading) {
                            return (
                                <Stack gap={4} pt={4} pb="sm" px={2}>
                                    {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"].map((k) => (
                                        <Skeleton key={k} height={36} radius="md" />
                                    ))}
                                </Stack>
                            );
                        }
                        if (sessions.length === 0) {
                            return (
                                <Box pb="sm" style={{ textAlign: "center" }}>
                                    <Text size="sm" c="dimmed">No previous sessions</Text>
                                </Box>
                            );
                        }
                        return (
                            <Stack gap={3} pb="sm">
                                {sessions.map((s) => (
                                    <Group
                                        key={s.id}
                                        gap={0}
                                        wrap="nowrap"
                                        style={{
                                            borderRadius: 8,
                                            position: "relative",
                                            transition: "opacity 150ms ease",
                                            opacity: deleteSession.isPending && deleteSession.variables === s.id ? 0.4 : 1,
                                        }}
                                    >
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <NavLink
                                                label={
                                                    <Text size="sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {s.title}
                                                    </Text>
                                                }
                                                leftSection={<IconMessage size={16} />}
                                                active={s.id === sessionId}
                                                onClick={() => { onSelectSession(s.id); onCloseMobile(); }}
                                                style={navItemStyle}
                                            />
                                        </Box>
                                        <ActionIcon
                                            size={30}
                                            variant="subtle"
                                            color="gray"
                                            style={{ flexShrink: 0, margin: "0 2px" }}
                                            onClick={(e) => handleDelete(s.id, e)}
                                            title="Delete session"
                                            disabled={deleteSession.isPending}
                                            loading={deleteSession.isPending && deleteSession.variables === s.id}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                ))}
                            </Stack>
                        );
                    })()}
                </ScrollArea>
            </Box>

            {/* Static nav — 3-col icon grid, always fully visible */}
            <Box px={6} py="xs" style={{ flexShrink: 0 }}>

                {/* ── Health group ── */}
                <Box px={2} pt={4} pb={2}>
                    <Text style={sectionLabelStyle}>Health</Text>
                </Box>
                <SimpleGrid cols={3} spacing={4} pb={4}>
                    <NavGridItem
                        icon={<IconClipboardHeart size={18} />}
                        label="Assessments"
                        active={pathname.startsWith("/chat/assessments")}
                        onClick={() => nav("/chat/assessments")}
                    />
                    <NavGridItem
                        icon={<IconHeartbeat size={18} />}
                        label="Health Records"
                        active={pathname.startsWith("/chat/health-records")}
                        onClick={() => nav("/chat/health-records")}
                    />
                    <NavGridItem
                        icon={<IconSalad size={18} />}
                        label="Diet Plans"
                        active={pathname.startsWith("/chat/diet-plans")}
                        onClick={() => nav("/chat/diet-plans")}
                    />
                    <NavGridItem
                        icon={<IconNotes size={18} />}
                        label="Pt. Summary"
                        active={pathname.startsWith("/chat/patient-summary")}
                        onClick={() => nav("/chat/patient-summary")}
                    />
                </SimpleGrid>

                <Divider my="xs" />

                {/* ── Clinical group ── */}
                <Box px={2} pt={4} pb={2}>
                    <Text style={sectionLabelStyle}>Clinical</Text>
                </Box>
                <SimpleGrid cols={3} spacing={4} pb={4}>
                    <NavGridItem
                        icon={<IconStethoscope size={18} />}
                        label="My Doctors"
                        active={pathname.startsWith("/chat/doctors")}
                        onClick={() => nav("/chat/doctors")}
                    />
                    <NavGridItem
                        icon={<IconCapsule size={18} />}
                        label="Medications"
                        active={pathname.startsWith("/chat/medications")}
                        onClick={() => nav("/chat/medications")}
                    />
                    <NavGridItem
                        icon={<IconClipboardList size={18} />}
                        label="Prescriptions"
                        active={pathname.startsWith("/chat/prescriptions")}
                        onClick={() => nav("/chat/prescriptions")}
                    />
                    <NavGridItem
                        icon={<IconVideo size={18} />}
                        label="See a Doctor"
                        active={pathname.startsWith("/chat/connect")}
                        onClick={() => nav("/chat/connect")}
                    />
                    <NavGridItem
                        icon={<IconPhone size={18} />}
                        label="Calls"
                        active={pathname.startsWith("/chat/calls")}
                        onClick={() => nav("/chat/calls")}
                    />
                </SimpleGrid>

                <Divider my="xs" />

                {/* ── Account group ── */}
                <Box px={2} pt={4} pb={2}>
                    <Text style={sectionLabelStyle}>Account</Text>
                </Box>
                <SimpleGrid cols={3} spacing={4}>
                    <NavGridItem
                        icon={<IconHistory size={18} />}
                        label="History"
                        active={pathname === "/chat/history"}
                        onClick={() => nav("/chat/history")}
                    />
                    <NavGridItem
                        icon={<IconFolder size={18} />}
                        label="My Files"
                        active={pathname === "/chat/files"}
                        onClick={() => nav("/chat/files")}
                    />
                    <NavGridItem
                        icon={<IconShield size={18} />}
                        label="Insurance"
                        active={pathname.startsWith("/chat/insurance")}
                        onClick={() => nav("/chat/insurance")}
                    />
                    <NavGridItem
                        icon={<IconUsers size={18} />}
                        label="Family"
                        active={pathname.startsWith("/chat/family-members")}
                        onClick={() => nav("/chat/family-members")}
                    />
                    <NavGridItem
                        icon={<IconUser size={18} />}
                        label="Profile"
                        active={pathname === "/chat/profile"}
                        onClick={() => nav("/chat/profile")}
                    />
                    <NavGridItem
                        icon={<IconGauge size={18} />}
                        label="Usage"
                        active={pathname === "/chat/usage"}
                        onClick={() => nav("/chat/usage")}
                    />
                    <NavGridItem
                        icon={<IconQuestionMark size={18} />}
                        label="FAQ & Help"
                        active={pathname === "/chat/faq"}
                        onClick={() => nav("/chat/faq")}
                    />
                </SimpleGrid>
            </Box>

            {/* Footer: color scheme toggle + copyright */}
            <Box
                px="md"
                py="sm"
                style={{
                    flexShrink: 0,
                    borderTop: "1px solid light-dark(var(--mantine-color-gray-2), rgba(255,255,255,0.06))",
                }}
            >
                <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed" lh={1.4}>
                        © 2026 CosmoOps Pvt Ltd
                        <br />
                        v{version}
                    </Text>
                    <Tooltip
                        label={computedColorScheme === "dark" ? "Light mode" : "Dark mode"}
                        position="top"
                        withArrow
                    >
                        <ActionIcon
                            onClick={() => setColorScheme(computedColorScheme === "dark" ? "light" : "dark")}
                            variant="subtle"
                            color="gray"
                            size="md"
                            radius="xl"
                            aria-label="Toggle color scheme"
                        >
                            {computedColorScheme === "dark"
                                ? <IconSun size={16} stroke={1.5} />
                                : <IconMoon size={16} stroke={1.5} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Box>
        </AppShell.Navbar>
    );
}
