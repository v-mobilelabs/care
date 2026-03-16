import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "./_components/keys";
import { ListMessagesUseCase } from "@/data/sessions";
import { GetCreditsUseCase } from "@/data/credits";
import { ChatContent } from "./_content";
import { ChatSkeleton } from "./_chat-skeleton";
import { ActiveProfileProvider } from "@/ui/chat/context/active-profile-context";

async function ChatData({
    userId,
    sessionId,
}: Readonly<{ userId: string; sessionId: string }>) {
    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchInfiniteQuery({
            queryKey: chatKeys.messages(sessionId),
            queryFn: () =>
                new ListMessagesUseCase().execute({
                    userId,
                    profileId: userId,
                    sessionId,
                }),
            initialPageParam: undefined as string | undefined,
        }),
        queryClient.prefetchQuery({
            queryKey: chatKeys.credits(),
            queryFn: () => new GetCreditsUseCase().execute({ userId }),
        }),
    ]);
    // Wrap ChatContent with ActiveProfileProvider to provide context
    return (
        <Hydrate client={queryClient}>
            <ActiveProfileProvider>
                <ChatContent />
            </ActiveProfileProvider>
        </Hydrate>
    );
}

// ── Chat page (SSR) ───────────────────────────────────────────────────────────
// Streams the loading skeleton immediately while messages + credits are
// prefetched on the server and hydrated into the TanStack cache.
export default async function ChatPage({
    searchParams,
}: Readonly<{
    searchParams: Promise<{ id?: string }>;
}>) {
    const [user, { id: sessionId }] = await Promise.all([
        getServerUser(),
        searchParams,
    ]);

    if (!user || !sessionId) {
        return (
            <Hydrate client={getQueryClient()}>
                <ChatContent />
            </Hydrate>
        );
    }

    return (
        <Suspense fallback={<ChatSkeleton />}>
            <ChatData userId={user.uid} sessionId={sessionId} />
        </Suspense>
    );
}
