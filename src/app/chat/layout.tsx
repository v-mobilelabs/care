"use client";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Sidebar } from "@/app/chat/_components/sidebar";
import { ChatHeader } from "@/app/chat/_components/chat-header";
import { RightSidebar } from "@/app/chat/_components/right-sidebar";
import { ChatContext } from "@/app/chat/_context/chat-context";
import { ConsentGate, hasConsented, CONSENT_KEY } from "@/app/chat/_components/consent-gate";
import { RightSidebarProvider, useRightSidebar } from "@/app/chat/_context/right-sidebar-context";
import { ActiveProfileProvider } from "@/app/chat/_context/active-profile-context";
import { QueryProvider } from "@/ui/providers/query-provider";
import { useProfileQuery } from "@/app/chat/_query";

// ── Shell — client component that owns all session-routing state ──────────────

function ChatShell({ children }: Readonly<{ children: React.ReactNode }>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const { rightOpened, hasContent } = useRightSidebar();
    const [sessionId, setSessionId] = useState<string | null>(
        () => searchParams.get("id"),
    );
    // Initialize as null (unknown) to avoid SSR/CSR mismatch: localStorage is
    // unavailable on the server, so we must defer the consent check to a
    // useEffect that runs only on the client after hydration.
    const [consented, setConsented] = useState<boolean | null>(null);

    // Fast path: check localStorage first.
    useEffect(() => {
        setConsented(hasConsented());
    }, []);

    // Fallback: if localStorage was cleared or the user consented on another
    // device, derive consent from the server-persisted profile.consentedAt.
    const { data: profile } = useProfileQuery();
    useEffect(() => {
        if (!consented && profile?.consentedAt) {
            localStorage.setItem(CONSENT_KEY, "accepted");
            setConsented(true);
        }
    }, [consented, profile?.consentedAt]);

    // Only auto-create a session when on the root /chat page.
    // Sub-pages (profile, soap-notes, faq) don't carry ?id= and must not be redirected.
    const isChatRoot = pathname === "/chat";

    // Sync sessionId whenever the URL ?id= param changes (e.g. navigating from
    // a sub-page to /chat?id=xxx via the SOAP notes "Session" button).
    useEffect(() => {
        const urlId = searchParams.get("id");
        if (urlId && urlId !== sessionId) {
            setSessionId(urlId);
        }
    }, [searchParams, sessionId]);

    useEffect(() => {
        // Don't create a new session if the URL already carries a valid id —
        // the sync effect above will pick it up. This prevents a race where
        // both effects fire on the same render (e.g. navigating from a sub-page
        // to /chat?id=xxx) and the auto-create wins with a stale null sessionId.
        const urlId = searchParams.get("id");
        if (isChatRoot && !sessionId && !urlId) {
            const id = crypto.randomUUID();
            setSessionId(id);
            router.replace(`/chat?id=${id}`);
        }
    }, [isChatRoot, sessionId, router, searchParams]);

    function handleNewChat() {
        const id = crypto.randomUUID();
        setSessionId(id);
        router.replace(`/chat?id=${id}`);
    }

    function handleSelectSession(id: string) {
        setSessionId(id);
        router.replace(`/chat?id=${id}`);
    }

    // Suppress render until consent status is known (avoids hydration mismatch
    // from the localStorage read) and until sessionId is ready on the chat root.
    if (consented === null) return null;
    if (isChatRoot && !sessionId) return null;

    return (
        <>
            {!consented && <ConsentGate onAccept={() => setConsented(true)} />}
            <ChatContext.Provider
                value={{ sessionId: sessionId ?? "", onNewChat: handleNewChat, onSelectSession: handleSelectSession }}
            >
                <AppShell
                    navbar={{
                        width: 260,
                        breakpoint: "sm",
                        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
                    }}
                    aside={{
                        width: 260,
                        breakpoint: "md",
                        collapsed: { mobile: !rightOpened || !hasContent, desktop: !rightOpened || !hasContent },
                    }}
                    padding={0}
                    style={{ height: "100dvh" }}
                >
                    <Sidebar
                        sessionId={sessionId ?? ""}
                        onNewChat={handleNewChat}
                        onSelectSession={handleSelectSession}
                        onCloseMobile={closeMobile}
                    />
                    <RightSidebar />
                    <AppShell.Main
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100dvh",
                            overflow: "hidden",
                        }}
                    >
                        <ChatHeader
                            mobileNavOpened={mobileOpened}
                            desktopNavOpened={desktopOpened}
                            onOpenMobile={toggleMobile}
                            onToggleDesktop={toggleDesktop}
                        />
                        {children}
                    </AppShell.Main>
                </AppShell>
            </ChatContext.Provider>
        </>
    );
}

// ── Layout — Next.js App Router layout for /chat/** ───────────────────────────

export default function ChatRootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <QueryProvider>
            <ActiveProfileProvider>
                <RightSidebarProvider>
                    <Suspense>
                        <ChatShell>{children}</ChatShell>
                    </Suspense>
                </RightSidebarProvider>
            </ActiveProfileProvider>
        </QueryProvider>
    );
}
