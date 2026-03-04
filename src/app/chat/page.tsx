import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/chat/_keys";
import { ListMessagesUseCase } from "@/data/sessions";
import { GetCreditsUseCase } from "@/data/credits";
import { ChatContent } from "./_content";

// ── Chat page (SSR) ───────────────────────────────────────────────────────────
// Prefetches messages + credits server-side so the client cache is warm on
// first render — no loading skeletons for data that was already available.

export default async function ChatPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const [user, { id: sessionId }] = await Promise.all([
        getServerUser(),
        searchParams,
    ]);

    const queryClient = getQueryClient();

    if (user && sessionId) {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: chatKeys.messages(sessionId),
                queryFn: () =>
                    new ListMessagesUseCase().execute(
                        ListMessagesUseCase.validate({ userId: user.uid, profileId: user.uid, sessionId }),
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: chatKeys.credits(),
                queryFn: () =>
                    new GetCreditsUseCase().execute(
                        GetCreditsUseCase.validate({ userId: user.uid }),
                    ),
            }),
        ]);
    }

    return (
        <Hydrate client={queryClient}>
            <ChatContent />
        </Hydrate>
    );
}
