import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { EncounterDetailContent } from "./_content";
import EncounterDetailLoading from "./loading";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ encounterId: string }>;
}) {
    const { encounterId } = await params;
    return { title: `Encounter ${encounterId.slice(0, 8)}… — Doctor Portal` };
}

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function EncounterData({ userId, encounterId }: Readonly<{ userId: string; encounterId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["encounters", encounterId] as const,
        queryFn: async () => {
            const { GetEncounterUseCase } = await import("@/data/encounters");
            return new GetEncounterUseCase().execute({ encounterId, userId });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <EncounterDetailContent encounterId={encounterId} />
        </Hydrate>
    );
}

export default async function EncounterDetailPage({
    params,
}: {
    params: Promise<{ encounterId: string }>;
}) {
    const { encounterId } = await params;
    const user = await getServerUser();
    if (!user) return <EncounterDetailContent encounterId={encounterId} />;
    return (
        <Suspense fallback={<EncounterDetailLoading />}>
            <EncounterData userId={user.uid} encounterId={encounterId} />
        </Suspense>
    );
}
