"use client";
import { ActionIcon, Avatar, Badge, Box, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
    IconBolt,
    IconGauge,
    IconLayoutSidebar,
    IconLogout,
    IconPlus,
    IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/ui/providers/auth-provider";
import { signOut } from "@/lib/auth/sign-out";
import { useCreditsQuery, useProfileQuery } from "@/app/chat/_query";
import { useChatContext } from "@/app/chat/_context/chat-context";
import { getInitials } from "@/lib/get-initials";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";

interface ChatHeaderProps {
    mobileNavOpened: boolean;
    desktopNavOpened: boolean;
    onOpenMobile: () => void;
    onToggleDesktop: () => void;
}

export function ChatHeader({
    mobileNavOpened,
    desktopNavOpened,
    onOpenMobile,
    onToggleDesktop,
}: Readonly<ChatHeaderProps>) {
    const { user } = useAuth();
    const router = useRouter();
    const { data: credits } = useCreditsQuery();
    const { data: profile } = useProfileQuery();
    const { onNewChat } = useChatContext();
    const { online } = usePresenceStatus(user?.uid);

    async function handleSignOut() {
        await signOut();
        router.replace("/auth/login");
    }

    const photoURL = profile?.photoUrl ?? user?.photoURL ?? null;
    const displayName = profile?.name ?? user?.displayName ?? null;
    const initials = getInitials(displayName, user?.email);

    return (
        <Box
            px="lg" py="sm"
            style={{
                flexShrink: 0,
            }}
        >
            <Group justify="space-between">
                <Group gap="sm">
                    <Tooltip label={mobileNavOpened ? "Close sidebar" : "Open sidebar"} position="bottom" withArrow>
                        <ActionIcon variant="subtle" color="gray" hiddenFrom="sm" onClick={onOpenMobile} aria-label="Toggle sidebar">
                            <IconLayoutSidebar size={20} stroke={1.5} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={desktopNavOpened ? "Close sidebar" : "Open sidebar"} position="bottom" withArrow>
                        <ActionIcon variant="subtle" color="gray" visibleFrom="sm" onClick={onToggleDesktop} aria-label="Toggle sidebar">
                            <IconLayoutSidebar size={20} stroke={1.5} />
                        </ActionIcon>
                    </Tooltip>
                    <Button
                        variant="subtle"
                        color="primary"
                        size="sm"
                        leftSection={<IconPlus size={16} />}
                        onClick={onNewChat}
                    >
                        New session
                    </Button>
                </Group>
                <Group gap={8}>
                    {credits !== undefined && (() => {
                        let color = "teal";
                        if (credits.remaining === 0) color = "red";
                        else if (credits.remaining <= 3) color = "orange";
                        return (
                            <Tooltip label={`${credits.remaining} of ${credits.total} credits remaining today. Resets at midnight UTC.`} withArrow position="bottom">
                                <Badge
                                    leftSection={<IconBolt size={13} />}
                                    color={color}
                                    variant="light"
                                    size="sm"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => router.push("/chat/usage")}
                                >
                                    {credits.remaining}
                                </Badge>
                            </Tooltip>
                        );
                    })()}
                    <Menu position="bottom-end" withArrow offset={8}>
                        <Menu.Target>
                            <Avatar
                                src={photoURL ?? undefined}
                                size={28}
                                radius="xl"
                                color="primary"
                                style={{
                                    cursor: "pointer",
                                    outline: `2px solid ${online ? "var(--mantine-color-teal-5)" : "var(--mantine-color-red-5)"}`,
                                    outlineOffset: "2px",
                                }}
                                aria-label="User menu"
                            >
                                {!photoURL && initials}
                            </Avatar>
                        </Menu.Target>
                        <Menu.Dropdown miw={200}>
                            <Menu.Label>
                                <Text size="xs" fw={600} truncate>{displayName ?? user?.email ?? "Signed in"}</Text>
                                {displayName && <Text size="xs" c="dimmed" truncate>{user?.email}</Text>}
                            </Menu.Label>
                            <Menu.Divider />
                            <Menu.Item leftSection={<IconUser size={16} />} onClick={() => router.push("/chat/profile")}>Profile</Menu.Item>
                            <Menu.Item leftSection={<IconGauge size={16} />} onClick={() => router.push("/chat/usage")}>Usage</Menu.Item>
                            <Menu.Divider />
                            <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={() => void handleSignOut()}>
                                Sign out
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>
        </Box>
    );
}

