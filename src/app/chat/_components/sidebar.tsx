"use client";
import {
    ActionIcon,
    AppShell,
    Box,
    Group,
    NavLink,
    ScrollArea,
    Select,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
    useComputedColorScheme,
    useMantineColorScheme,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
    IconCapsule,
    IconChevronDown,
    IconClipboardHeart,
    IconClipboardList,
    IconHeartbeat,
    IconFolder,
    IconHistory,
    IconMessage,
    IconQuestionMark,
    IconSalad,
    IconShield,
    IconStethoscope,
    IconMoon,
    IconSun,
    IconTrash,
    IconUser,
    IconUsers,
    IconX,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
    useSessionsQuery,
    useDeleteSessionMutation,
    useDependentsQuery,
} from "@/app/chat/_query";
import { useActiveProfile } from "@/app/chat/_context/active-profile-context";

interface SidebarProps {
    sessionId: string;
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
    onCloseMobile: () => void;
}

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
            label: `${d.firstName}${d.lastName ? ` ${d.lastName}` : ""}`,
            icon: <IconUsers size={16} />,
        })),
    ];

    function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        modals.openConfirmModal({
            title: "Delete assessment?",
            children: <Text size="sm">This will permanently remove this session from your history. This cannot be undone.</Text>,
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteSession.mutate(id, {
                    onSuccess: () => {
                        if (id === sessionId) onNewChat();
                    },
                });
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
            {/* Brand + New Chat */}
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
                        // Start a fresh session so the new chat is tagged with the correct profile.
                        onNewChat();
                    }}
                    data={profileOptions.map(({ value, label }) => ({ value, label }))}
                    leftSection={<IconChevronDown size={14} />}
                    styles={{ input: { fontWeight: 600 } }}
                    comboboxProps={{ withinPortal: false }}
                    aria-label="Switch profile"
                />
            </Box>
            {/* History label */}
            <Box px="md" pt="sm" pb={4} style={{ flexShrink: 0 }}>
                <Text
                    size="sm"
                    c="dimmed"
                    fw={600}
                    style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}
                >
                    History
                </Text>
            </Box>

            {/* Session list */}
            <ScrollArea style={{ flex: 1 }} px={6}>
                {(() => {
                    if (sessionsLoading) {
                        return (
                            <Stack gap={4} pt={4} pb="md" px={4}>
                                {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"].map((k) => (
                                    <Skeleton key={k} height={38} radius="md" />
                                ))}
                            </Stack>
                        );
                    }
                    if (sessions.length === 0) {
                        return (
                            <Box py="xl" style={{ textAlign: "center" }}>
                                <Text size="sm" c="dimmed">No previous sessions</Text>
                            </Box>
                        );
                    }
                    return (
                        <Stack gap={3} pb="md">
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
                                            style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
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

            {/* Bottom nav */}
            <Box
                px={6}
                py="xs"
                style={{
                    flexShrink: 0,
                    borderTop: "1px solid light-dark(var(--mantine-color-gray-2), rgba(255,255,255,0.06))",
                }}
            >
                <Stack gap={2}>
                    <NavLink
                        label={<Text size="sm">Search History</Text>}
                        leftSection={<IconHistory size={16} />}
                        active={pathname === "/chat/history"}
                        onClick={() => { startNavTransition(() => { router.push("/chat/history"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">My Assessments</Text>}
                        leftSection={<IconClipboardHeart size={16} />}
                        active={pathname.startsWith("/chat/assessments")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/assessments"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">Health Records</Text>}
                        leftSection={<IconHeartbeat size={16} />}
                        active={pathname.startsWith("/chat/health-records")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/health-records"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink label={<Text size="sm">My Doctors</Text>}
                        leftSection={<IconStethoscope size={16} />}
                        active={pathname.startsWith("/chat/doctors")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/doctors"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink label={<Text size="sm">My Medications</Text>}
                        leftSection={<IconCapsule size={16} />}
                        active={pathname.startsWith("/chat/medications")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/medications"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">Prescriptions</Text>}
                        leftSection={<IconClipboardList size={16} />}
                        active={pathname.startsWith("/chat/prescriptions")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/prescriptions"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">Diet Plans</Text>}
                        leftSection={<IconSalad size={16} />}
                        active={pathname.startsWith("/chat/diet-plans")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/diet-plans"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">My Files</Text>}
                        leftSection={<IconFolder size={16} />}
                        active={pathname === "/chat/files"}
                        onClick={() => { startNavTransition(() => { router.push("/chat/files"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">Insurance</Text>}
                        leftSection={<IconShield size={16} />}
                        active={pathname.startsWith("/chat/insurance")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/insurance"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">Family Members</Text>}
                        leftSection={<IconUsers size={16} />}
                        active={pathname.startsWith("/chat/family-members")}
                        onClick={() => { startNavTransition(() => { router.push("/chat/family-members"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">Profile</Text>}
                        leftSection={<IconUser size={16} />}
                        active={pathname === "/chat/profile"}
                        onClick={() => { startNavTransition(() => { router.push("/chat/profile"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                    <NavLink
                        label={<Text size="sm">FAQ & Help</Text>}
                        leftSection={<IconQuestionMark size={16} />}
                        active={pathname === "/chat/faq"}
                        onClick={() => { startNavTransition(() => { router.push("/chat/faq"); }); onCloseMobile(); }}
                        style={{ borderRadius: 8, paddingTop: 8, paddingBottom: 8 }}
                    />
                </Stack>
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
