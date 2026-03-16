import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListConditionsUseCase } from "@/data/conditions";
import { ListSoapNotesUseCase } from "@/data/soap-notes";
import { HealthRecordsContent } from "./_content";

// ── Health Records page (SSR) ─────────────────────────────────────────────────
// Prefetches conditions + SOAP notes server-side so both tabs render
// immediately without skeletons.

export default async function HealthRecordsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.conditions(), undefined],
                queryFn: () =>
                    new ListConditionsUseCase().execute(
                        { userId: user.uid },
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.soapNotes(), undefined],
                queryFn: () =>
                    new ListSoapNotesUseCase().execute(
                        { userId: user.uid },
                    ),
            }),
        ]);
    }

    return (
        <Hydrate client={queryClient}>
            <HealthRecordsContent />
        </Hydrate>
    );
}
