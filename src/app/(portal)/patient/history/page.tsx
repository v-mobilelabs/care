import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListSessionsUseCase } from "@/data/sessions";
import { HistoryContent } from "./_content";
import HistoryLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function HistoryData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.sessions(), undefined],
        queryFn: () =>
            new ListSessionsUseCase().execute(
                { userId, profileId: userId },
            ),
    });
    return (
        <Hydrate client={queryClient}>
            <HistoryContent />
        </Hydrate>
    );
}

// ── History page (SSR) ────────────────────────────────────────────────────────
export default async function HistoryPage() {
    const user = await getServerUser();
    if (!user) return <HistoryContent />;
    return (
        <Suspense fallback={<HistoryLoading />}>
            <HistoryData userId={user.uid} />
        </Suspense>
    );
}
