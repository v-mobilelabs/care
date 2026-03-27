import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/ui/ai/keys";
import { getCachedSymptomObservations } from "@/data/cached";
import { SymptomsContent } from "./_content";
import SymptomsLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function SymptomsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchInfiniteQuery({
        queryKey: [
            ...chatKeys.symptomObservations(),
            undefined, // pid — undefined on SSR, resolved on client
            "all",
            "desc",
            50,
        ],
        queryFn: () => getCachedSymptomObservations(userId),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof getCachedSymptomObservations>>,
        ) => lastPage.nextCursor ?? undefined,
    });
    return (
        <Hydrate client={queryClient}>
            <SymptomsContent />
        </Hydrate>
    );
}

export default async function SymptomsPage() {
    const user = await getServerUser();
    if (!user) return <SymptomsContent />;
    return (
        <Suspense fallback={<SymptomsLoading />}>
            <SymptomsData userId={user.uid} />
        </Suspense>
    );
}
