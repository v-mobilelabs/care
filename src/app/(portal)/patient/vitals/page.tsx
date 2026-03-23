import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { getCachedVitals } from "@/data/cached";
import { VitalsContent } from "./_content";
import VitalsLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function VitalsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.vitals(), undefined],
        queryFn: () => getCachedVitals(userId),
    });
    return (
        <Hydrate client={queryClient}>
            <VitalsContent />
        </Hydrate>
    );
}

export default async function VitalsPage() {
    const user = await getServerUser();
    if (!user) return <VitalsContent />;
    return (
        <Suspense fallback={<VitalsLoading />}>
            <VitalsData userId={user.uid} />
        </Suspense>
    );
}
