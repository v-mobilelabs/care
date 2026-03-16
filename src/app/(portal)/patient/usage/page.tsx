import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/api/server-prefetch";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { UsageContent } from "./_content";
import UsageLoading from "./loading";

export const metadata = { title: "Usage" };

// ── Async data boundary — streams skeleton immediately, data follows ─────────

async function UsageData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: chatKeys.credits(),
            queryFn: async () => {
                const { GetUsageUseCase } = await import("@/data/usage/use-cases/get-usage.use-case");
                const usage = await new GetUsageUseCase().execute({ profile: userId });
                return {
                    credits: usage.credits,
                    minutes: usage.minutes,
                    storage: usage.storage,
                    lastReset: usage.lastReset,
                };
            },
        }),
        queryClient.prefetchQuery({
            queryKey: chatKeys.storageMetrics(),
            queryFn: async () => {
                const { GetStorageMetricsUseCase } = await import("@/data/sessions");
                return new GetStorageMetricsUseCase().execute({ userId });
            },
        }),
        queryClient.prefetchQuery({
            queryKey: chatKeys.dependents(),
            queryFn: async () => {
                const { ListDependentsUseCase } = await import("@/data/dependents");
                return new ListDependentsUseCase().execute({ ownerId: userId });
            },
        }),
        queryClient.prefetchQuery({
            queryKey: chatKeys.callMetrics(),
            queryFn: async () => {
                const { GetCallMetricsUseCase } = await import("@/data/meet");
                return new GetCallMetricsUseCase().execute({ patientId: userId });
            },
        }),
    ]);

    return (
        <Hydrate client={queryClient}>
            <UsageContent />
        </Hydrate>
    );
}

export default async function UsagePage() {
    const user = await getServerUser();

    if (!user) {
        return (
            <Hydrate client={getQueryClient()}>
                <UsageContent />
            </Hydrate>
        );
    }

    return (
        <Suspense fallback={<UsageLoading />}>
            <UsageData userId={user.uid} />
        </Suspense>
    );
}
