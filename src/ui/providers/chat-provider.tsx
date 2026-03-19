"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AssistantContext } from "../ai/context/chat-context";
import { useMessages } from "@/ui/ai/hooks/use-messages";

export function AIAssistantProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive sessionId from the URL — no separate state needed
    const urlSessionId = searchParams.get("id");

    // Only auto-create a session when on the assistant page.
    // Sub-pages (profile, soap-notes, faq) don't carry ?id= and must not be redirected.
    const isChatRoot = pathname === "/patient/assistant";

    // Auto-create a session ID when on the chat root with no URL id present.
    useEffect(() => {
        if (isChatRoot && !urlSessionId) {
            router.replace(`/patient/assistant?id=${crypto.randomUUID()}`);
        }
    }, [isChatRoot, urlSessionId, router]);

    function handleNewChat() {
        router.replace(`/patient/assistant?id=${crypto.randomUUID()}`);
    }

    function handleSelectSession(id: string) {
        router.replace(`/patient/assistant?id=${id}`);
    }

    // ── Shared messages state ─────────────────────────────────────────────────
    const sessionId = urlSessionId ?? "";
    const messagesValue = useMessages(sessionId);

    return (
        <AssistantContext.Provider value={{ sessionId, onNewChat: handleNewChat, onSelectSession: handleSelectSession, messages: messagesValue }}>
            {children}
        </AssistantContext.Provider>
    );
}
