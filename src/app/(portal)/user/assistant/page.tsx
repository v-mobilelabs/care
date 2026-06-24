import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import { getCachedSessions } from "@/data/cached";
import { ChatContent } from "./_content";
import { ChatSkeleton } from "./_chat-skeleton";

// ── Async data boundary — prefetch sessions on server ─────────────────────────
async function AssistantData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.sessions(userId)],
        queryFn: () => getCachedSessions(userId),
    });
    return (
        <Hydrate client={queryClient}>
            <ChatContent />
        </Hydrate>
    );
}

// ── Chat page (SSR) ───────────────────────────────────────────────────────────
// Streams the loading skeleton immediately while sessions + messages + credits are
// prefetched on the server and hydrated into the TanStack cache.
export default async function ChatPage() {
    const user = await getServerUser();
    if (!user) return <ChatContent />;
    
    return (
        <Suspense fallback={<ChatSkeleton />}>
            <AssistantData userId={user.uid} />
        </Suspense>
    );
}
