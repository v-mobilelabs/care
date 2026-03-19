"use client";

import { createContext, useContext } from "react";
import type { useMessages } from "@/ui/ai/hooks/use-messages";

export interface ChatContextValue {
    sessionId: string;
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChatContext must be used within a ChatProvider");
    return ctx;
}

// ── Messages context — exposes useMessages return value via provider ─────────

export type MessagesContextValue = ReturnType<typeof useMessages>;

/** Pending message payload set by useAskAI, consumed by the provider. */
export interface PendingAskAI {
    text: string;
    sessionId: string;
    files?: Array<{ url: string; mediaType: string }>;
}

export interface MessagesProviderValue {
    messages: MessagesContextValue;
    pendingAskAI: PendingAskAI | null;
    setPendingAskAI: (pending: PendingAskAI | null) => void;
}

export const MessagesContext = createContext<MessagesProviderValue | null>(null);

export function useMessagesContext(): MessagesContextValue {
    const ctx = useContext(MessagesContext);
    if (!ctx) throw new Error("useMessagesContext must be used within AIAssistantProvider");
    return ctx.messages;
}

export function usePendingAskAI() {
    const ctx = useContext(MessagesContext);
    if (!ctx) throw new Error("usePendingAskAI must be used within AIAssistantProvider");
    return { pendingAskAI: ctx.pendingAskAI, setPendingAskAI: ctx.setPendingAskAI };
}
