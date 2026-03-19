import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DoctorEncountersContent } from "./_content";
import EncountersLoading from "./loading";

export const metadata = { title: "Encounters — Doctor Portal" };

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function EncountersData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["encounters"] as const,
        queryFn: async () => {
            const { ListEncountersUseCase } = await import(
                "@/data/encounters"
            );
            return new ListEncountersUseCase().execute({
                userId,
                kind: "doctor",
            });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <DoctorEncountersContent />
        </Hydrate>
    );
}

export default async function DoctorEncountersPage() {
    const user = await getServerUser();
    if (!user) return <DoctorEncountersContent />;
    return (
        <Suspense fallback={<EncountersLoading />}>
            <EncountersData userId={user.uid} />
        </Suspense>
    );
}
