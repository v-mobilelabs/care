"use client";
import {
    ActionIcon,
    Box,
    Group,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    Tooltip,
    UnstyledButton,
    useComputedColorScheme,
    useMantineColorScheme,
    Overlay,
} from "@mantine/core";
import { ios } from "@/ui/ios";
import { modals } from "@mantine/modals";
import {
    IconCapsule,
    IconClipboardHeart,
    IconClipboardList,
    IconFolder,
    IconGauge,
    IconHeartbeat,
    IconMessage,
    IconMessageCircle,
    IconMoon,
    IconNotes,
    IconPhone,
    IconPlus,
    IconQuestionMark,
    IconSalad,
    IconShield,
    IconStethoscope,
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
} from "@/app/(portal)/patient/_query";
import { useChatContext } from "@/app/(portal)/patient/_context/chat-context";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppsModalProps {
    opened: boolean;
    onClose: () => void;
}

// ── App definition ────────────────────────────────────────────────────────────

interface AppDef {
    icon: React.ReactNode;
    label: string;
    href: string;
    match: (pathname: string) => boolean;
}

// ── Shared icon style (translucent, theme-aware) ──────────────────────────────

const APP_ICON_COLOR = "light-dark(var(--mantine-color-indigo-7), var(--mantine-color-violet-4))";

// Frosted-glass tokens
const GLASS_SHEET = "light-dark(var(--mantine-color-gray-0), rgba(30,30,30,0.55))";
const GLASS_CARD = "light-dark(rgba(255,255,255,0.55), rgba(30,30,30,0.55))";
const GLASS_BLUR = "blur(60px)";
const ICON_SIZE = 34;
// ── App lists ─────────────────────────────────────────────────────────────────

const HEALTH_APPS: AppDef[] = [
    {
        icon: <IconClipboardHeart size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Assessments",
        href: "/patient/assessments",
        match: (p) => p.startsWith("/patient/assessments"),
    },
    {
        icon: <IconHeartbeat size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Health",
        href: "/patient/health-records",
        match: (p) => p.startsWith("/patient/health-records"),
    },
    {
        icon: <IconSalad size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Diet Plans",
        href: "/patient/diet-plans",
        match: (p) => p.startsWith("/patient/diet-plans"),
    },
    {
        icon: <IconNotes size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Summary",
        href: "/patient/patient-summary",
        match: (p) => p.startsWith("/patient/patient-summary"),
    },
];

const CLINICAL_APPS: AppDef[] = [
    {
        icon: <IconStethoscope size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Doctors",
        href: "/patient/doctors",
        match: (p) => p.startsWith("/patient/doctors"),
    },
    {
        icon: <IconVideo size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Consult",
        href: "/patient/connect",
        match: (p) => p.startsWith("/patient/connect"),
    },
    {
        icon: <IconCapsule size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Medications",
        href: "/patient/medications",
        match: (p) => p.startsWith("/patient/medications"),
    },
    {
        icon: <IconClipboardList size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Rx",
        href: "/patient/prescriptions",
        match: (p) => p.startsWith("/patient/prescriptions"),
    },
    {
        icon: <IconPhone size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Calls",
        href: "/patient/calls",
        match: (p) => p.startsWith("/patient/calls"),
    },
];

const ACCOUNT_APPS: AppDef[] = [
    {
        icon: <IconUser size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Profile",
        href: "/profile",
        match: (p) => p.startsWith("/profile"),
    },
    {
        icon: <IconFolder size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Files",
        href: "/patient/files",
        match: (p) => p === "/patient/files",
    },
    {
        icon: <IconShield size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Insurance",
        href: "/patient/insurance",
        match: (p) => p.startsWith("/patient/insurance"),
    },
    {
        icon: <IconUsers size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Family",
        href: "/patient/family-members",
        match: (p) => p.startsWith("/patient/family-members"),
    },
    {
        icon: <IconGauge size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Usage",
        href: "/patient/usage",
        match: (p) => p.startsWith("/patient/usage"),
    },
    {
        icon: <IconQuestionMark size={ICON_SIZE} style={{ color: APP_ICON_COLOR }} stroke={1.5} />,
        label: "Help",
        href: "/patient/faq",
        match: (p) => p === "/patient/faq",
    },
];

// ── iOS App icon ──────────────────────────────────────────────────────────────

interface AppIconProps {
    app: AppDef;
    active: boolean;
    onClick: () => void;
}

function AppIcon({ app, active, onClick }: Readonly<AppIconProps>) {
    return (
        <UnstyledButton
            onClick={onClick}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <Box
                style={{
                    width: 56,
                    height: 56,
                    background: GLASS_CARD,
                    backdropFilter: GLASS_BLUR,
                    WebkitBackdropFilter: GLASS_BLUR,
                    border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: active
                        ? "0 0 0 2.5px var(--mantine-color-primary-6)"
                        : "light-dark(0 1px 4px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.25))",
                    transform: active ? "scale(1.05)" : "scale(1)",
                    transition: "transform 150ms ease, box-shadow 150ms ease",
                }}
            >
                {app.icon}
            </Box>
            <Text
                size="10px"
                fw={active ? 600 : 400}
                lh={1.2}
                ta="center"
                truncate
                style={{
                    maxWidth: 64,
                    color: active
                        ? "var(--mantine-color-primary-6)"
                        : "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
                }}
            >
                {app.label}
            </Text>
        </UnstyledButton>
    );
}

// ── Section header ────────────────────────────────────────────────────────────

// SectionHeader removed: Modal usage was incorrect and props were not available in this context.

// ── Session row ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 44;
const SEPARATOR = "light-dark(#C6C6C8, #38383A)";

function rowBackground(active: boolean, hovered: boolean): string {
    if (active) return "light-dark(var(--mantine-color-primary-0), rgba(99,102,241,0.12))";
    if (hovered) return "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))";
    return "transparent";
}

interface SessionRowProps {
    title: string;
    active: boolean;
    deleting: boolean;
    showSeparator: boolean;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

function SessionRow({ title, active, deleting, showSeparator, onClick, onDelete }: Readonly<SessionRowProps>) {
    const [hovered, setHovered] = useState(false);

    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            style={{
                position: "relative", opacity: deleting ? 0.4 : 1, transition: "opacity 150ms ease",
                display: "flex", alignItems: "center", width: "100%",
                minHeight: ROW_HEIGHT, padding: "0 12px", gap: 10,
                background: rowBackground(active, hovered),
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <Box
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: active
                        ? "linear-gradient(135deg, #667eea, #764ba2)"
                        : "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
            >
                <IconMessage size={14} color={active ? "white" : "light-dark(#999, #777)"} stroke={1.5} />
            </Box>
            <Text size="sm" fw={active ? 600 : 400} truncate
                style={{ flex: 1, color: active ? "var(--mantine-color-primary-6)" : undefined }}>
                {title}
            </Text>
            {hovered && (
                <Tooltip label="Delete" position="right" withArrow>
                    <ActionIcon size={24} variant="subtle" color="red" radius="md"
                        onClick={onDelete} aria-label="Delete session" style={{ flexShrink: 0 }}>
                        <IconTrash size={13} />
                    </ActionIcon>
                </Tooltip>
            )}
            {showSeparator && (
                <Box style={{ position: "absolute", bottom: 0, left: 50, right: 0, height: 0.5, background: SEPARATOR }} />
            )}
        </Box>
    );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AppsModal({ opened, onClose }: Readonly<AppsModalProps>) {
    // Inject keyframes for iOS Spotlight animation
    // Only inject once per mount
    if (globalThis.window !== undefined) {
        if (!document.getElementById("ios-spotlight-keyframes")) {
            const style = document.createElement("style");
            style.id = "ios-spotlight-keyframes";
            style.innerHTML = ios.allKeyframes;
            document.head.appendChild(style);
        }
    }
    const pathname = usePathname();
    const router = useRouter();
    const [, startTransition] = useTransition();
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });

    const { data: sessions = [], isLoading: sessionsLoading } = useSessionsQuery();
    const deleteSession = useDeleteSessionMutation();
    const { sessionId, onNewChat, onSelectSession } = useChatContext();

    function nav(href: string) {
        startTransition(() => router.push(href));
        onClose();
    }

    function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();

        function onDeleteSuccess() {
            if (id !== sessionId) return;
            const next = sessions.find((s) => s.id !== id);
            if (next) { onSelectSession(next.id); } else { onNewChat(); }
        }

        modals.openConfirmModal({
            title: "Delete session?",
            children: <Text size="sm">This will permanently remove this session and cannot be undone.</Text>,
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => { deleteSession.mutate(id, { onSuccess: onDeleteSuccess }); },
        });
    }

    function handleSelectSession(id: string) {
        onSelectSession(id);
        onClose();
    }

    function handleNewChat() {
        onNewChat();
        onClose();
    }

    function renderGrid(apps: AppDef[]) {
        return (
            <SimpleGrid cols={4} spacing={16} verticalSpacing={16}>
                {apps.map((app) => (
                    <AppIcon
                        key={app.href}
                        app={app}
                        active={app.match(pathname)}
                        onClick={() => nav(app.href)}
                    />
                ))}
            </SimpleGrid>
        );
    }

    return opened ? (
        <>
            <Overlay
                opacity={0.35}
                blur={4}
                zIndex={299}
                onClick={onClose}
                style={{ transition: ios.transition.entrance }}
            />
            <Box
                style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Box
                    style={{
                        width: "min(600px, 96vw)",
                        maxHeight: "92dvh",
                        borderRadius: 20,
                        background: GLASS_SHEET,
                        backdropFilter: GLASS_BLUR,
                        WebkitBackdropFilter: GLASS_BLUR,
                        border: "1.5px solid light-dark(rgba(0,0,0,0.07), rgba(255,255,255,0.10))",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)",
                        padding: 0,
                        overflow: "auto",
                        animation: ios.animation.scaleIn(),
                        transition: ios.transition.entrance,
                    }}
                >
                    {/* Drag handle */}
                    <Box style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, position: "sticky", top: 0, zIndex: 3, background: GLASS_SHEET, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR }}>
                        <Box
                            style={{
                                width: 36, height: 5, borderRadius: 3,
                                background: "light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
                            }}
                        />
                    </Box>
                    {/* Header row: close, title, dark mode */}
                    <Group align="center" px="md" py={6} style={{
                        position: "sticky", top: 19, zIndex: 3,
                        background: GLASS_SHEET,
                        backdropFilter: GLASS_BLUR,
                        WebkitBackdropFilter: GLASS_BLUR,
                        borderBottom: "light-dark(1px solid rgba(0,0,0,0.06), 1px solid rgba(255,255,255,0.06))",
                        minHeight: 48,
                    }}>
                        <ActionIcon
                            variant="subtle"
                            size={32}
                            radius="xl"
                            aria-label="Close"
                            onClick={onClose}
                            style={{
                                background: GLASS_CARD,
                                backdropFilter: GLASS_BLUR,
                                WebkitBackdropFilter: GLASS_BLUR,
                                border: "light-dark(1px solid rgba(0,0,0,0.06), 1px solid rgba(255,255,255,0.1))",
                            }}
                        >
                            <IconX size={18} />
                        </ActionIcon>
                        <Box style={{ flex: 1, textAlign: "center" }}>
                            <Text fw={700} size="lg" style={{ letterSpacing: -0.2 }}>Apps</Text>
                        </Box>
                        <ActionIcon
                            variant="subtle"
                            size={32}
                            radius="xl"
                            aria-label="Toggle dark mode"
                            onClick={() => setColorScheme(computedColorScheme === "dark" ? "light" : "dark")}
                            style={{
                                background: GLASS_CARD,
                                backdropFilter: GLASS_BLUR,
                                WebkitBackdropFilter: GLASS_BLUR,
                                border: "light-dark(1px solid rgba(0,0,0,0.06), 1px solid rgba(255,255,255,0.1))",
                            }}
                        >
                            {computedColorScheme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </ActionIcon>
                    </Group>
                    <Box px="lg" pb="xl" mt="md">
                        {/* Chat & Sessions */}
                        <Text fw={700} size="md" mt="md" mb="xs">Chat & Sessions</Text>
                        <Box
                            style={{
                                background: GLASS_CARD,
                                backdropFilter: GLASS_BLUR,
                                WebkitBackdropFilter: GLASS_BLUR,
                                borderRadius: 14,
                                overflow: "hidden",
                                marginBottom: 24,
                                border: "light-dark(1px solid rgba(0,0,0,0.06), 1px solid rgba(255,255,255,0.08))",
                            }}
                        >
                            {/* New Chat button */}
                            <UnstyledButton
                                onClick={handleNewChat}
                                style={{
                                    display: "flex", alignItems: "center", width: "100%",
                                    padding: "12px 14px", gap: 12,
                                    WebkitTapHighlightColor: "transparent",
                                }}
                            >
                                <Box
                                    style={{
                                        width: 40, height: 40, borderRadius: 11,
                                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                    }}
                                >
                                    <IconMessageCircle size={20} color="white" stroke={1.6} />
                                </Box>
                                <Text size="sm" fw={600} style={{ flex: 1 }}>New Chat</Text>
                                <Box
                                    style={{
                                        width: 28, height: 28, borderRadius: 8,
                                        background: "light-dark(var(--mantine-color-primary-0), rgba(99,102,241,0.15))",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    <IconPlus size={15} color="var(--mantine-color-primary-6)" stroke={2} />
                                </Box>
                            </UnstyledButton>
                            {/* Session list */}
                            {(() => {
                                if (sessionsLoading) {
                                    return (
                                        <Stack py="md" gap={0}>
                                            {(["sk-1", "sk-2", "sk-3"]).map((id) => (
                                                <Skeleton key={id} height={38} radius={8} my={2} />
                                            ))}
                                        </Stack>
                                    );
                                }
                                if (sessions.length === 0) {
                                    return (
                                        <Box py="md" style={{ textAlign: "center" }}>
                                            <Text size="xs" c="dimmed">No sessions yet — start a new chat!</Text>
                                        </Box>
                                    );
                                }
                                return (
                                    <>
                                        <Box style={{ height: 0.5, background: SEPARATOR, marginLeft: 14, marginRight: 14 }} />
                                        {sessions.slice(0, 5).map((s, i) => (
                                            <SessionRow
                                                key={s.id}
                                                title={s.title}
                                                active={s.id === sessionId}
                                                deleting={deleteSession.isPending && deleteSession.variables === s.id}
                                                showSeparator={i < Math.min(sessions.length, 5) - 1}
                                                onClick={() => handleSelectSession(s.id)}
                                                onDelete={(e) => handleDelete(s.id, e)}
                                            />
                                        ))}
                                        {sessions.length > 5 && (
                                            <>
                                                <Box style={{ height: 0.5, background: SEPARATOR, marginLeft: 14, marginRight: 14 }} />
                                                <UnstyledButton
                                                    onClick={() => nav("/patient/history")}
                                                    style={{
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        width: "100%", padding: "10px 14px",
                                                        WebkitTapHighlightColor: "transparent",
                                                    }}
                                                >
                                                    <Text size="xs" fw={500} c="primary">
                                                        View all {sessions.length} sessions
                                                    </Text>
                                                </UnstyledButton>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </Box>
                        {/* Health */}
                        <Text fw={700} size="md" mt="md" mb="xs">Health</Text>
                        {renderGrid(HEALTH_APPS)}
                        <Box my="lg" />
                        {/* Clinical */}
                        <Text fw={700} size="md" mt="md" mb="xs">Clinical</Text>
                        {renderGrid(CLINICAL_APPS)}
                        <Box my="lg" />
                        {/* Account */}
                        <Text fw={700} size="md" mt="md" mb="xs">Account</Text>
                        {renderGrid(ACCOUNT_APPS.filter(app => app.label !== "Help"))}
                        <Box my="lg" />
                        {/* Support */}
                        <Text fw={700} size="md" mt="md" mb="xs">Support</Text>
                        {renderGrid(ACCOUNT_APPS.filter(app => app.label === "Help"))}
                    </Box>
                </Box>
            </Box>
        </>
    ) : null;
}
