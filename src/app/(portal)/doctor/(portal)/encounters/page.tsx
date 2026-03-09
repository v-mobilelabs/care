import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DoctorEncountersContent } from "./_content";

export const metadata = { title: "Encounters — Doctor Portal" };

export default async function DoctorEncountersPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: ["encounters"] as const,
            queryFn: async () => {
                const { ListEncountersUseCase } = await import(
                    "@/data/encounters"
                );
                return new ListEncountersUseCase().execute({
                    userId: user.uid,
                    kind: "doctor",
                });
            },
        });
    }

    return (
        <Hydrate client={queryClient}>
            <DoctorEncountersContent />
        </Hydrate>
    );
}
