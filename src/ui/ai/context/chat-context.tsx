"use client";

import { createContext, useContext, useState } from "react";
import type { useMessages } from "@/ui/ai/hooks/use-messages";

export type MessagesContextValue = ReturnType<typeof useMessages>;

export interface AssistantContextValue {
    sessionId: string;
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
    messages: MessagesContextValue;
}

export const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistantContext(): AssistantContextValue {
    const ctx = useContext(AssistantContext);
    if (!ctx) throw new Error("useAssistantContext must be used within AIAssistantProvider");
    return ctx;
}

/** Convenience hook — returns only the chat navigation values. */
export function useChatContext() {
    const { sessionId, onNewChat, onSelectSession } = useAssistantContext();
    return { sessionId, onNewChat, onSelectSession };
}

/** Convenience hook — returns the full useMessages value. */
export function useMessagesContext(): MessagesContextValue {
    return useAssistantContext().messages;
}

// ── Pending AskAI context ─────────────────────────────────────────────────────

export interface PendingAskAIValue {
    text: string;
    sessionId: string;
    files?: Array<{ url: string; mediaType: string }>;
}

const PendingAskAIContext = createContext<{
    pendingAskAI: PendingAskAIValue | null;
    setPendingAskAI: (value: PendingAskAIValue | null) => void;
}>({
    pendingAskAI: null,
    setPendingAskAI: () => { },
});

export function PendingAskAIProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [pendingAskAI, setPendingAskAI] = useState<PendingAskAIValue | null>(null);
    return (
        <PendingAskAIContext.Provider value={{ pendingAskAI, setPendingAskAI }}>
            {children}
        </PendingAskAIContext.Provider>
    );
}

/** Returns setPendingAskAI to queue a message for auto-send on the assistant page. */
export function usePendingAskAI() {
    return useContext(PendingAskAIContext);
}
