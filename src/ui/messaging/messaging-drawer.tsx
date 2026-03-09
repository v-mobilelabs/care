"use client";
import { AppShell } from "@mantine/core";
import { ConversationList } from "./conversation-list";
import { MessageThread } from "./message-thread";
import { useMessaging } from "../providers/messaging-provider";

/** Width of the messaging sidebar in px (desktop). */
export const MESSAGING_SIDEBAR_WIDTH = 400;

/**
 * Right-side sidebar panel for messaging.
 * - Desktop (≥ 768 px): fixed-width flex item that pushes main content.
 * - Mobile (< 768 px): full-width overlay on top of main content.
 */
export function MessagingSidebar() {
    const { close, activeConversationId, setActiveConversationId } =
        useMessaging();

    return (
        <AppShell.Aside style={{ zIndex: 200 }}>
            {activeConversationId ? (
                <MessageThread
                    conversationId={activeConversationId}
                    onBack={() => setActiveConversationId(null)}
                />
            ) : (
                <ConversationList
                    onSelect={(convId) => setActiveConversationId(convId)}
                    onClose={close}
                />
            )}
        </AppShell.Aside>
    );
}
