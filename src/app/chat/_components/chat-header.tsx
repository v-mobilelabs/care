"use client";
import { ActionIcon, Avatar, Badge, Box, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
    IconBolt,
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
    IconLogout,
    IconPlus,
    IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/ui/providers/auth-provider";
import { signOut } from "@/lib/auth/sign-out";
import { useCreditsQuery } from "@/app/chat/_query";
import { useChatContext } from "@/app/chat/_context/chat-context"

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
    const { onNewChat } = useChatContext();

    async function handleSignOut() {
        await signOut();
        router.replace("/auth/login");
    }

    const initials = user?.displayName
        ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "?";

    return (
        <Box
            px="lg" py="sm"
            style={{
                flexShrink: 0,
            }}
        >
            <Group justify="space-between">
                <Group gap="sm">
                    <ActionIcon variant="subtle" color="gray" size="md" hiddenFrom="sm" onClick={onOpenMobile} aria-label="Toggle sidebar">
                        {mobileNavOpened ? <IconLayoutSidebarLeftCollapse size={20} /> : <IconLayoutSidebarLeftExpand size={20} />}
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="gray" size="md" visibleFrom="sm" onClick={onToggleDesktop} aria-label="Toggle sidebar">
                        {desktopNavOpened ? <IconLayoutSidebarLeftCollapse size={20} /> : <IconLayoutSidebarLeftExpand size={20} />}
                    </ActionIcon>
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
                        const color = credits.remaining === 0 ? "red" : credits.remaining <= 3 ? "orange" : "teal";
                        return (
                            <Tooltip label={`${credits.remaining} of ${credits.total} credits remaining today. Resets at midnight UTC.`} withArrow position="bottom">
                                <Badge
                                    leftSection={<IconBolt size={13} />}
                                    color={color}
                                    variant="light"
                                    size="md"
                                    style={{ cursor: "default" }}
                                >
                                    {credits.remaining}/{credits.total}
                                </Badge>
                            </Tooltip>
                        );
                    })()}
                    <Menu position="bottom-end" withArrow offset={8}>
                        <Menu.Target>
                            <Avatar
                                src={user?.photoURL ?? undefined}
                                size={36}
                                radius="xl"
                                color="primary"
                                style={{ cursor: "pointer" }}
                                aria-label="User menu"
                            >
                                {!user?.photoURL && initials}
                            </Avatar>
                        </Menu.Target>
                        <Menu.Dropdown miw={200}>
                            <Menu.Label>
                                <Text size="xs" fw={600} truncate>{user?.displayName ?? user?.email ?? "Signed in"}</Text>
                                {user?.displayName && <Text size="xs" c="dimmed" truncate>{user.email}</Text>}
                            </Menu.Label>
                            <Menu.Divider />
                            <Menu.Item leftSection={<IconUser size={16} />} onClick={() => router.push("/chat/profile")}>Profile</Menu.Item>
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

