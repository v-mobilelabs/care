import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import { getCachedConditions } from "@/data/cached";
import { ConditionsContent } from "./_content";
import ConditionsLoading from "./loading";

async function ConditionsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.conditions(), undefined],
        queryFn: () => getCachedConditions(userId),
    });
    return (
        <Hydrate client={queryClient}>
            <ConditionsContent />
        </Hydrate>
    );
}

export default async function ConditionsPage() {
    const user = await getServerUser();
    if (!user) return <ConditionsContent />;
    return (
        <Suspense fallback={<ConditionsLoading />}>
            <ConditionsData userId={user.uid} />
        </Suspense>
    );
}
