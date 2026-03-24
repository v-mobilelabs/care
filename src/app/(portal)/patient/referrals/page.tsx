import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { getCachedReferrals } from "@/data/cached";
import { ReferralsContent } from "./_content";
import ReferralsLoading from "./loading";

// ── Async data boundary ───────────────────────────────────────────────────────

async function ReferralsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    const initialQuery = "limit=20";
    await queryClient.prefetchInfiniteQuery({
        queryKey: [...chatKeys.referrals(), "paginated", userId, initialQuery],
        queryFn: () => getCachedReferrals(userId),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof getCachedReferrals>>,
        ) => lastPage.nextCursor ?? undefined,
    });
    return (
        <Hydrate client={queryClient}>
            <ReferralsContent />
        </Hydrate>
    );
}

// ── Referrals page (SSR) ──────────────────────────────────────────────────────

export default async function ReferralsPage() {
    const user = await getServerUser();
    if (!user) return <ReferralsContent />;
    return (
        <Suspense fallback={<ReferralsLoading />}>
            <ReferralsData userId={user.uid} />
        </Suspense>
    );
}
