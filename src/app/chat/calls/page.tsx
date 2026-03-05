import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { CallsContent } from "./_content";

export const metadata = { title: "Call History" };

export default async function CallsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: ["meet", "history"] as const,
            queryFn: async () => {
                const { ListCallHistoryUseCase } = await import("@/data/meet");
                return new ListCallHistoryUseCase().execute({
                    userId: user.uid,
                    kind: user.kind as "patient" | "doctor",
                });
            },
        });
    }

    return (
        <Hydrate client={queryClient}>
            <CallsContent />
        </Hydrate>
    );
}
