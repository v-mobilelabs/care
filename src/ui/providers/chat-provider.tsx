"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConsentGate, hasConsented, CONSENT_KEY } from "@/ui/ai/components/consent-gate";
import { ChatContext, MessagesContext } from "../ai/context/chat-context";
import type { PendingAskAI } from "../ai/context/chat-context";
import { useProfileQuery } from "../ai/query";
import { useMessages } from "@/ui/ai/hooks/use-messages";

export function AIAssistantProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive sessionId from the URL — no separate state needed
    const urlSessionId = searchParams.get("id");

    // Initialize as null (unknown) to avoid SSR/CSR mismatch: localStorage is
    // unavailable on the server, so we must defer the consent check to a
    // useEffect that runs only on the client after hydration.
    const [consented, setConsented] = useState<boolean | null>(null);

    // Fast path: check localStorage first (deferred to avoid synchronous setState in effect).
    useEffect(() => {
        queueMicrotask(() => setConsented(hasConsented()));
    }, []);

    // Fallback: if localStorage was cleared or the user consented on another
    // device, derive consent from the server-persisted profile.consentedAt.
    const { data: profile } = useProfileQuery();
    useEffect(() => {
        if (!consented && profile?.consentedAt) {
            localStorage.setItem(CONSENT_KEY, "accepted");
            queueMicrotask(() => setConsented(true));
        }
    }, [consented, profile?.consentedAt]);

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

    // ── Pending ask-AI (set by useAskAI, auto-sent once hydrated) ─────────────
    const [pendingAskAI, setPendingAskAI] = useState<PendingAskAI | null>(null);

    useEffect(() => {
        if (!pendingAskAI) return;
        // Wait until the session ID matches and messages are hydrated.
        if (pendingAskAI.sessionId !== sessionId) return;
        if (!messagesValue.isHydrated) return;

        const { text, files } = pendingAskAI;
        // Defer state update to avoid calling setState synchronously in an effect.
        queueMicrotask(() => setPendingAskAI(null));

        // Set pending attachments so the server can store file references.
        if (files && files.length > 0) {
            messagesValue.setPendingAttachments(files);
        }

        // Build file parts for sendMessage.
        const fileParts = files?.map((f) => ({
            type: "file" as const,
            url: f.url,
            mediaType: f.mediaType,
        }));

        void messagesValue.sendMessage(
            fileParts && fileParts.length > 0
                ? { text, files: fileParts }
                : { text },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingAskAI, sessionId, messagesValue.isHydrated]);

    // Always render children so loading.tsx / Suspense boundaries can mount.
    // Show ConsentGate only once we definitively know consent is missing
    // (consented === false). Skipping it when null avoids a hydration mismatch
    // since localStorage isn't available on the server.
    return (
        <>
            {consented === false && <ConsentGate onAccept={() => setConsented(true)} />}
            <ChatContext.Provider value={{ sessionId, onNewChat: handleNewChat, onSelectSession: handleSelectSession }}>
                <MessagesContext.Provider value={{ messages: messagesValue, pendingAskAI, setPendingAskAI }}>
                    {children}
                </MessagesContext.Provider>
            </ChatContext.Provider>
        </>
    );
}
