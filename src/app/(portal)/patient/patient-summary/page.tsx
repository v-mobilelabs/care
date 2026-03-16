import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListPatientSummariesUseCase } from "@/data/patient-summary";
import { PatientSummaryContent } from "./_content";
import PatientSummaryLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function SummaryData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.patientSummaries(), undefined],
        queryFn: () =>
            new ListPatientSummariesUseCase().execute({ userId }),
    });
    return (
        <Hydrate client={queryClient}>
            <PatientSummaryContent />
        </Hydrate>
    );
}

// ── Patient Summary page (SSR) ────────────────────────────────────────────────
export default async function PatientSummaryPage() {
    const user = await getServerUser();

    if (!user) {
        return (
            <Hydrate client={getQueryClient()}>
                <PatientSummaryContent />
            </Hydrate>
        );
    }

    return (
        <Suspense fallback={<PatientSummaryLoading />}>
            <SummaryData userId={user.uid} />
        </Suspense>
    );
}
