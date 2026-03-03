"use client";
import { createContext, useContext } from "react";

export interface ChatContextValue {
    sessionId: string;
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChatContext must be used inside ChatLayout");
    return ctx;
}
