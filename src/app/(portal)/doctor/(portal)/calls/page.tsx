import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DoctorCallsContent } from "./_content";

export const metadata = { title: "Call History — Doctor Portal" };

export default async function DoctorCallsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: ["meet", "history"] as const,
            queryFn: async () => {
                const { ListCallHistoryUseCase } = await import("@/data/meet");
                return new ListCallHistoryUseCase().execute({
                    userId: user.uid,
                    kind: "doctor",
                });
            },
        });
    }

    return (
        <Hydrate client={queryClient}>
            <DoctorCallsContent />
        </Hydrate>
    );
}
