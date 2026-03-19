import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DashboardContent } from "./_content";
import DoctorDashboardLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function DashboardData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["profile"] as const,
        queryFn: async () => {
            const { GetProfileUseCase } = await import("@/data/profile");
            return new GetProfileUseCase().execute({ userId });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <DashboardContent />
        </Hydrate>
    );
}

export default async function DoctorDashboardPage() {
    const user = await getServerUser();
    if (!user) return <DashboardContent />;
    return (
        <Suspense fallback={<DoctorDashboardLoading />}>
            <DashboardData userId={user.uid} />
        </Suspense>
    );
}
