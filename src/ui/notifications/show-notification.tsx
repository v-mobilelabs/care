"use client";
import { notifications } from "@mantine/notifications";
import {
    IconInfoCircle,
    IconCircleCheck,
    IconAlertTriangle,
    IconAlertCircle,
} from "@tabler/icons-react";
import { Box, Group, Text, ThemeIcon } from "@mantine/core";
import type { AppNotification, NotificationType } from "@/lib/notifications/types";

const typeConfig: Record<
    NotificationType,
    { color: string; gradient: string; icon: React.ReactNode }
> = {
    info: {
        color: "blue",
        gradient: "linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-indigo-5))",
        icon: <IconInfoCircle size={18} stroke={1.8} color="white" />,
    },
    success: {
        color: "teal",
        gradient: "linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-teal-4))",
        icon: <IconCircleCheck size={18} stroke={1.8} color="white" />,
    },
    warning: {
        color: "orange",
        gradient: "linear-gradient(135deg, var(--mantine-color-yellow-6), var(--mantine-color-orange-5))",
        icon: <IconAlertTriangle size={18} stroke={1.8} color="white" />,
    },
    danger: {
        color: "red",
        gradient: "linear-gradient(135deg, var(--mantine-color-red-5), var(--mantine-color-pink-5))",
        icon: <IconAlertCircle size={18} stroke={1.8} color="white" />,
    },
};

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Show an iOS 26-style notification toast using Mantine's notification system.
 * Stacks automatically; auto-closes after 5 seconds.
 */
export function showIOSNotification(
    notification: AppNotification,
    onNavigate?: (link: string) => void,
    onClose?: () => void,
) {
    const config = typeConfig[notification.type] ?? typeConfig.info;

    notifications.show({
        id: notification.id,
        autoClose: 5000,
        withCloseButton: false,
        onClose,
        onClick: () => {
            notifications.hide(notification.id);
            if (notification.link && onNavigate) {
                onNavigate(notification.link);
            }
        },
        style: {
            cursor: notification.link ? "pointer" : "default",
            background:
                "light-dark(rgba(255,255,255,0.82), rgba(30,30,30,0.82))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRadius: 20,
            border:
                "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
            boxShadow:
                "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            padding: 0,
            overflow: "hidden",
            "--notification-color": "transparent",
        } as React.CSSProperties,
        message: (
            <Box px={14} py={12}>
                <Group gap={10} align="flex-start" wrap="nowrap">
                    <ThemeIcon
                        size={34}
                        radius={10}
                        variant="filled"
                        style={{
                            background: config.gradient,
                            flexShrink: 0,
                            marginTop: 1,
                        }}
                    >
                        {config.icon}
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" gap={6} wrap="nowrap">
                            <Text
                                size="sm"
                                fw={600}
                                truncate
                                style={{ flex: 1, lineHeight: 1.3 }}
                            >
                                {notification.title}
                            </Text>
                            <Text
                                size="xs"
                                c="dimmed"
                                style={{ flexShrink: 0, fontSize: 11 }}
                            >
                                {formatTimeAgo(notification.createdAt)}
                            </Text>
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2} mt={2} style={{ lineHeight: 1.4 }}>
                            {notification.message}
                        </Text>
                    </Box>
                </Group>
            </Box>
        ),
    });
}
