import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DoctorCallsContent } from "./_content";
import DoctorCallsLoading from "./loading";

export const metadata = { title: "Call History — Doctor Portal" };

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function DoctorCallsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["meet", "history"] as const,
        queryFn: async () => {
            const { ListCallHistoryUseCase } = await import("@/data/meet");
            return new ListCallHistoryUseCase().execute({
                userId,
                kind: "doctor",
            });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <DoctorCallsContent />
        </Hydrate>
    );
}

export default async function DoctorCallsPage() {
    const user = await getServerUser();
    if (!user) return <DoctorCallsContent />;
    return (
        <Suspense fallback={<DoctorCallsLoading />}>
            <DoctorCallsData userId={user.uid} />
        </Suspense>
    );
}
