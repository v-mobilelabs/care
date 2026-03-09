"use client";
import { ActionIcon, Indicator, Tooltip } from "@mantine/core";
import { IconMessageCircle } from "@tabler/icons-react";
import { useInbox } from "@/lib/messaging/use-inbox";
import { useAuth } from "@/ui/providers/auth-provider";
import { useMessaging } from "../providers/messaging-provider";

/**
 * Header icon button that opens the messaging drawer.
 * Shows an unread-count badge when there are unseen messages.
 */
export function MessagesButton() {
    const { toggle, isOpen } = useMessaging();
    const { user } = useAuth();
    const { entries } = useInbox(user?.uid ?? null);
    const unreadCount = entries.reduce((sum, e) => sum + e.unread, 0);

    return (
        <Tooltip label="Messages" position="bottom" withArrow>
            <Indicator
                color="red"
                size={16}
                label={unreadCount > 0 ? String(unreadCount) : undefined}
                disabled={unreadCount === 0}
                offset={4}
            >
                <ActionIcon
                    variant={isOpen ? "filled" : "light"}
                    color="primary"
                    size="lg"
                    radius="xl"
                    onClick={toggle}
                    aria-label="Messages"
                >
                    <IconMessageCircle size={20} stroke={1.5} />
                </ActionIcon>
            </Indicator>
        </Tooltip>
    );
}
