"use client";
import {
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    Title,
    UnstyledButton,
} from "@mantine/core";
import {
    IconBell,
    IconCheck,
    IconInfoCircle,
    IconAlertTriangle,
    IconCircleCheck,
    IconAlertCircle,
    IconChevronRight,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/ui/providers/auth-provider";
import { useNotifications } from "@/lib/notifications/use-notifications";
import type { AppNotification } from "@/lib/notifications/types";
import { colors } from "@/ui/tokens";
import { iosCard, glassTint } from "@/ui/ios";

// ── Notification type → color + icon ─────────────────────────────────────────

const TYPE_META: Record<
    AppNotification["type"],
    { color: string; icon: React.ReactNode }
> = {
    info: {
        color: "blue",
        icon: <IconInfoCircle size={18} />,
    },
    success: {
        color: colors.success,
        icon: <IconCircleCheck size={18} />,
    },
    warning: {
        color: colors.warning,
        icon: <IconAlertTriangle size={18} />,
    },
    danger: {
        color: colors.danger,
        icon: <IconAlertCircle size={18} />,
    },
};

// ── Single notification row ───────────────────────────────────────────────────

function NotificationRow({
    notification,
    onRead,
}: Readonly<{
    notification: AppNotification;
    onRead: (id: string) => void;
}>) {
    const router = useRouter();
    const meta = TYPE_META[notification.type] ?? TYPE_META.info;

    function handleClick() {
        if (!notification.read) onRead(notification.id);
        if (notification.link) router.push(notification.link);
    }

    return (
        <UnstyledButton
            onClick={handleClick}
            style={{ width: "100%", WebkitTapHighlightColor: "transparent" }}
        >
            <Paper
                radius="lg"
                p="md"
                style={{
                    ...iosCard,
                    opacity: notification.read ? 0.7 : 1,
                    transition: "opacity 200ms ease",
                    background: notification.read
                        ? "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
                        : "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
                }}
            >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                    {/* Type icon */}
                    <Box
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `light-dark(var(--mantine-color-${meta.color}-0), rgba(0,0,0,0.2))`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            color: `var(--mantine-color-${meta.color}-6)`,
                        }}
                    >
                        {meta.icon}
                    </Box>

                    {/* Content */}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={6} mb={2} wrap="nowrap">
                            <Text size="sm" fw={notification.read ? 400 : 600} truncate style={{ flex: 1 }}>
                                {notification.title}
                            </Text>
                            {!notification.read && (
                                <Box
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "var(--mantine-color-primary-6)",
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                            {notification.message}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                            {new Date(notification.createdAt).toLocaleString()}
                        </Text>
                    </Box>

                    {notification.link && (
                        <IconChevronRight
                            size={16}
                            style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0, marginTop: 2 }}
                        />
                    )}
                </Group>
            </Paper>
        </UnstyledButton>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
    const { user } = useAuth();
    const {
        notifications,
        loading,
        hasMore,
        loadingMore,
        unreadCount,
        loadMore,
        markAsRead,
        markAllAsRead,
    } = useNotifications(user?.uid ?? "");

    // Sentinel element for IntersectionObserver-based lazy loading
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!hasMore || loadingMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "200px" },
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadMore]);

    return (
        <Box maw={600} mx="auto" px="md" py="xl">
            {/* Header */}
            <Group justify="space-between" mb="lg" align="center">
                <Group gap="xs">
                    <Title order={2}>Notifications</Title>
                    {unreadCount > 0 && (
                        <Badge color="primary" variant="filled" size="sm" radius="xl">
                            {unreadCount}
                        </Badge>
                    )}
                </Group>
                {unreadCount > 0 && (
                    <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconCheck size={14} />}
                        onClick={markAllAsRead}
                    >
                        Mark all read
                    </Button>
                )}
            </Group>

            {/* List */}
            <Stack gap="sm">
                {loading && (
                    <Box style={{ display: "flex", justifyContent: "center", py: 40 }}>
                        <Loader size="sm" />
                    </Box>
                )}

                {!loading && notifications.length === 0 && (
                    <Box
                        style={{
                            ...glassTint,
                            borderRadius: 16,
                            padding: "48px 24px",
                            textAlign: "center",
                        }}
                    >
                        <IconBell size={40} style={{ color: "var(--mantine-color-dimmed)", marginBottom: 12 }} />
                        <Text fw={500}>No notifications yet</Text>
                        <Text size="sm" c="dimmed" mt={4}>
                            We&apos;ll let you know when something important happens.
                        </Text>
                    </Box>
                )}

                {notifications.map((n) => (
                    <NotificationRow
                        key={n.id}
                        notification={n}
                        onRead={markAsRead}
                    />
                ))}

                {/* Lazy-load sentinel */}
                <div ref={sentinelRef} />

                {loadingMore && (
                    <Box style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                        <Loader size="xs" />
                    </Box>
                )}

                {!hasMore && notifications.length > 0 && (
                    <Text ta="center" size="xs" c="dimmed" my="md">
                        You&apos;re all caught up
                    </Text>
                )}
            </Stack>
        </Box>
    );
}
