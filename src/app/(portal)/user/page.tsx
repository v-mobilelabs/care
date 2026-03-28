import { Suspense } from "react";
import { getServerUser } from "@/lib/api/server-prefetch";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import { GetUsageUseCase } from "@/data/usage";
import {
    getCachedAssessments,
    getCachedPatientSummaries,
    getCachedVitals,
} from "@/data/cached";
import { PatientHomeContent } from "./_content";
import PatientLoading from "./loading";

async function PatientHomeData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: chatKeys.credits(),
            queryFn: () => new GetUsageUseCase().execute({ profile: userId }),
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.vitals(), undefined],
            queryFn: () => getCachedVitals(userId),
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.assessments(), undefined],
            queryFn: async () => {
                const page = await getCachedAssessments(userId);
                if (Array.isArray(page)) {
                    return page;
                }
                return page.assessments;
            },
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.patientSummaries(), undefined],
            queryFn: () => getCachedPatientSummaries(userId),
        }),
    ]);

    return (
        <Hydrate client={queryClient}>
            <PatientHomeContent />
        </Hydrate>
    );
}

export default async function PatientPage() {
    const user = await getServerUser();

    if (!user) {
        return <PatientHomeContent />;
    }

    return (
        <Suspense fallback={<PatientLoading />}>
            <PatientHomeData userId={user.uid} />
        </Suspense>
    );
}
