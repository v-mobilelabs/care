import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { CallsContent } from "./_content";
import CallsLoading from "./loading";

export const metadata = { title: "Call History" };

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function CallsData({ userId, kind }: Readonly<{ userId: string; kind: "patient" | "doctor" }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["meet", "history"] as const,
        queryFn: async () => {
            const { ListCallHistoryUseCase } = await import("@/data/meet");
            return new ListCallHistoryUseCase().execute({ userId, kind });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <CallsContent />
        </Hydrate>
    );
}

export default async function CallsPage() {
    const user = await getServerUser();
    if (!user) return <CallsContent />;
    return (
        <Suspense fallback={<CallsLoading />}>
            <CallsData userId={user.uid} kind={user.kind as "patient" | "doctor"} />
        </Suspense>
    );
}
