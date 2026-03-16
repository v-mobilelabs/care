"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ConsentGate, hasConsented, CONSENT_KEY } from "@/ui/chat/components/consent-gate";
import { ChatContext } from "../chat/context/chat-context";
import { useProfileQuery } from "../chat/query";

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

    // Always render children so loading.tsx / Suspense boundaries can mount.
    // Show ConsentGate only once we definitively know consent is missing
    // (consented === false). Skipping it when null avoids a hydration mismatch
    // since localStorage isn't available on the server.
    return (
        <>
            {consented === false && <ConsentGate onAccept={() => setConsented(true)} />}
            <ChatContext.Provider value={{ sessionId: urlSessionId ?? "", onNewChat: handleNewChat, onSelectSession: handleSelectSession }}>
                {children}
            </ChatContext.Provider>
        </>
    );
}
