"use client";
import { ActionIcon, Indicator, Tooltip } from "@mantine/core";
import { IconMail, IconMailOpened } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
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
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={isOpen ? "open" : "closed"}
                            initial={{ scale: 0.6, opacity: 0, rotate: isOpen ? -30 : 30 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.6, opacity: 0, rotate: isOpen ? 30 : -30 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            {isOpen
                                ? <IconMailOpened size={20} stroke={1.5} />
                                : <IconMail size={20} stroke={1.5} />}
                        </motion.div>
                    </AnimatePresence>
                </ActionIcon>
            </Indicator>
        </Tooltip>
    );
}
