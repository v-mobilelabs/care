import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/chat/_keys";
import { ListPatientSummariesUseCase } from "@/data/patient-summary";
import { PatientSummaryContent } from "./_content";

// ── Patient Summary page (SSR) ────────────────────────────────────────────────
// Prefetches summaries server-side so the list renders immediately.

export default async function PatientSummaryPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: [...chatKeys.patientSummaries(), undefined],
            queryFn: () =>
                new ListPatientSummariesUseCase().execute(
                    ListPatientSummariesUseCase.validate({ userId: user.uid }),
                ),
        });
    }

    return (
        <Hydrate client={queryClient}>
            <PatientSummaryContent />
        </Hydrate>
    );
}
