"use client";
import { ActionIcon, Avatar, Box, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
    IconApps,
    IconGauge,
    IconLogout,
    IconPlus,
    IconUser,
    IconUsersGroup,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import { signOut } from "@/lib/auth/sign-out";
import { useCreditsQuery, useProfileQuery } from "@/ui/ai/query";
import { useChatContext } from "@/ui/ai/context/chat-context";
import { getInitials } from "@/lib/get-initials";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { MessagesButton } from "@/ui/messaging/messages-button";
import { NotificationsButton } from "@/ui/notifications/notifications-button";
import { AppsModal } from "@/ui/ai/components/apps-modal";
import { Credits } from "@/ui/credits";

export function ChatHeader() {
    const { user } = useAuth();
    const router = useRouter();
    const [appsOpened, setAppsOpened] = useState(false);
    const { data: credits } = useCreditsQuery();
    const { data: profile } = useProfileQuery();
    const { onNewChat } = useChatContext();
    const { online } = usePresenceStatus(user?.uid ?? "");

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
                    <Tooltip label="Apps" position="bottom" withArrow>
                        <ActionIcon variant="subtle" color="gray" size="md" radius="lg" onClick={() => setAppsOpened(true)} aria-label="Apps">
                            <IconApps size={20} stroke={1.5} />
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
                    <NotificationsButton />
                    <MessagesButton />
                    {credits !== undefined && (
                        <Credits />
                    )}
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
                            <Menu.Item leftSection={<IconUser size={16} />} onClick={() => router.push("/profile")}>Profile</Menu.Item>
                            <Menu.Item leftSection={<IconUsersGroup size={16} />} onClick={() => router.push("/chat/family-members")}>Family</Menu.Item>
                            <Menu.Divider />
                            <Menu.Item leftSection={<IconGauge size={16} />} onClick={() => router.push("/chat/usage")}>Usage</Menu.Item>
                            <Menu.Divider />
                            <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={() => void handleSignOut()}>
                                Sign out
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>
            <AppsModal opened={appsOpened} onClose={() => setAppsOpened(false)} />
        </Box>
    );
}

