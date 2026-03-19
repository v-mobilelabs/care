import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListDietPlansUseCase } from "@/data/diet-plans";
import { DietPlansContent } from "./_content";
import DietPlansLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function DietPlansData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.dietPlans(), undefined],
        queryFn: () =>
            new ListDietPlansUseCase().execute({ userId }),
    });
    return (
        <Hydrate client={queryClient}>
            <DietPlansContent />
        </Hydrate>
    );
}

export default async function DietPlansPage() {
    const user = await getServerUser();
    if (!user) return <DietPlansContent />;
    return (
        <Suspense fallback={<DietPlansLoading />}>
            <DietPlansData userId={user.uid} />
        </Suspense>
    );
}
