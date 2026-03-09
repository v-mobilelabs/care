"use client";
import { ActionIcon, Indicator, Tooltip } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useNotificationCenter } from "../providers/notification-provider";

/**
 * Header icon button for notifications.
 * Works as a toggle: first click shows toasts, second click dismisses them.
 */
export function NotificationsButton() {
    const { unreadCount } = useNotificationCenter();
    const router = useRouter();

    function handleClick() {
        router.push("/notifications");
    }

    return (
        <Tooltip label="Notifications" position="bottom" withArrow>
            <Indicator
                color="red"
                size={16}
                label={(() => {
                    if (unreadCount === 0) return undefined;
                    return unreadCount > 99 ? "99+" : String(unreadCount);
                })()}
                disabled={unreadCount === 0}
                offset={4}
            >
                <ActionIcon
                    variant={"subtle"}
                    color={"gray"}
                    size="lg"
                    radius="xl"
                    onClick={handleClick}
                    aria-label="Notifications"
                >
                    <IconBell size={20} stroke={1.5} />
                </ActionIcon>
            </Indicator>
        </Tooltip>
    );
}
