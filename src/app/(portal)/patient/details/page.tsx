import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { DetailsContent } from "./_content";
import PatientDetailsLoading from "./loading";

export const metadata = { title: "Health Details" };

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function DetailsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: chatKeys.patientDetails(),
        queryFn: async () => {
            const { GetPatientUseCase } = await import("@/data/patients");
            return new GetPatientUseCase().execute({ userId });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <DetailsContent />
        </Hydrate>
    );
}

export default async function PatientDetailsPage() {
    const user = await getServerUser();

    if (!user) {
        return (
            <Hydrate client={getQueryClient()}>
                <DetailsContent />
            </Hydrate>
        );
    }

    return (
        <Suspense fallback={<PatientDetailsLoading />}>
            <DetailsData userId={user.uid} />
        </Suspense>
    );
}
