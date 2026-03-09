import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { EncounterDetailContent } from "./_content";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ encounterId: string }>;
}) {
    const { encounterId } = await params;
    return { title: `Encounter ${encounterId.slice(0, 8)}… — Doctor Portal` };
}

export default async function EncounterDetailPage({
    params,
}: {
    params: Promise<{ encounterId: string }>;
}) {
    const { encounterId } = await params;
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: ["encounters", encounterId] as const,
            queryFn: async () => {
                const { GetEncounterUseCase } = await import(
                    "@/data/encounters"
                );
                return new GetEncounterUseCase().execute({
                    encounterId,
                    userId: user.uid,
                });
            },
        });
    }

    return (
        <Hydrate client={queryClient}>
            <EncounterDetailContent encounterId={encounterId} />
        </Hydrate>
    );
}
