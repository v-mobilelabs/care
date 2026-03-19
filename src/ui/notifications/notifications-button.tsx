"use client";
import { ActionIcon, Indicator, Loader, Tooltip } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import Link, { useLinkStatus } from "@/ui/link";
import { useNotificationCenter } from "../providers/notification-provider";

function BellIcon() {
    const { pending } = useLinkStatus();
    return (
        <AnimatePresence mode="wait" initial={false}>
            {pending ? (
                <motion.div
                    key="loader"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                    <Loader size={18} />
                </motion.div>
            ) : (
                <motion.div
                    key="bell"
                    initial={{ rotate: -30, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 30, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                    <IconBell size={20} stroke={1.5} />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Header icon button for notifications.
 */
export function NotificationsButton() {
    const { unreadCount } = useNotificationCenter();

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
                    component={Link}
                    href="/notifications"
                    variant={"light"}
                    size="lg"
                    radius="xl"
                    aria-label="Notifications"
                >
                    <BellIcon />
                </ActionIcon>
            </Indicator>
        </Tooltip>
    );
}
