import { Suspense } from "react";
import { ChatContent } from "./_content";
import { ChatSkeleton } from "./_chat-skeleton";

// ── Chat page (SSR) ───────────────────────────────────────────────────────────
// Streams the loading skeleton immediately while messages + credits are
// prefetched on the server and hydrated into the TanStack cache.
export default function ChatPage() {
    return (
        <Suspense fallback={<ChatSkeleton />}>
            <ChatContent />
        </Suspense>
    );
}
