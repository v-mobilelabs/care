import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/chat/_keys";
import { ListSessionsUseCase } from "@/data/sessions";
import { HistoryContent } from "./_content";

// ── History page (SSR) ────────────────────────────────────────────────────────
// Prefetches the sessions list server-side so the sidebar + search results
// are immediately available without a loading skeleton on first paint.

export default async function HistoryPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: [...chatKeys.sessions(), undefined],
            queryFn: () =>
                new ListSessionsUseCase().execute(
                    ListSessionsUseCase.validate({ userId: user.uid }),
                ),
        });
    }

    return (
        <Hydrate client={queryClient}>
            <HistoryContent />
        </Hydrate>
    );
}
