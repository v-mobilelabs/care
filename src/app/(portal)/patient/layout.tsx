"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChatContext } from "@/app/(portal)/patient/_context/chat-context";
import { ConsentGate, hasConsented, CONSENT_KEY } from "@/app/(portal)/patient/_components/consent-gate";
import { ActiveProfileProvider } from "@/app/(portal)/patient/_context/active-profile-context";
import { useProfileQuery } from "@/app/(portal)/patient/_query";
import { PortalLayout } from "@/ui/layouts/portal";
import { IconAi, IconStethoscope, IconVideo } from "@tabler/icons-react";

const menus = [
    {
        label: "Assistant",
        icon: <IconAi />,
        href: "/patient/assistant",
    },
    {
        label: "Doctors",
        icon: <IconStethoscope />,
        href: "/patient/doctors",
    },
    {
        label: "Consult",
        icon: <IconVideo />,
        href: "/patient/connect",
    }
    // Future menu items (e.g. SOAP notes, profile) would go here.
];

const application = {
    id: "careai-portal",
    name: "CareAI",
    url: "/patient/assistant",
    icon: <IconAi size={20} />,
};

function ChatShell({ children }: Readonly<{ children: React.ReactNode }>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
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

    // Only auto-create a session when on the assistant page.
    // Sub-pages (profile, soap-notes, faq) don't carry ?id= and must not be redirected.
    const isChatRoot = pathname === "/patient/assistant";

    // Sync sessionId whenever the URL ?id= param changes (e.g. navigating from
    // a sub-page to /patient/assistant?id=xxx via the SOAP notes "Session" button).
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
        // to /patient/assistant?id=xxx) and the auto-create wins with a stale null sessionId.
        const urlId = searchParams.get("id");
        if (isChatRoot && !sessionId && !urlId) {
            const id = crypto.randomUUID();
            setSessionId(id);
            router.replace(`/patient/assistant?id=${id}`);
        }
    }, [isChatRoot, sessionId, router, searchParams]);

    function handleNewChat() {
        const id = crypto.randomUUID();
        setSessionId(id);
        router.replace(`/patient/assistant?id=${id}`);
    }

    function handleSelectSession(id: string) {
        setSessionId(id);
        router.replace(`/patient/assistant?id=${id}`);
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
                <PortalLayout menus={{
                    navigation: menus,
                    header: [],
                    profile: [],
                }} application={application}>
                    {children}
                </PortalLayout>
            </ChatContext.Provider>
        </>
    );
}

// ── Layout — Next.js App Router layout for /patient/** ────────────────────────

export default function ChatRootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <ActiveProfileProvider>
            <Suspense>
                <ChatShell>{children}</ChatShell>
            </Suspense>
        </ActiveProfileProvider>
    );
}
