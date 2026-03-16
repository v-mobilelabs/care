import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListDoctorsUseCase } from "@/data/doctors";
import { ListPatientInvitesUseCase } from "@/data/doctor-patients";
import { DoctorsContent } from "./_content";
import DoctorsLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function DoctorsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.doctors(), undefined],
            queryFn: () => new ListDoctorsUseCase().execute({ userId }),
        }),
        queryClient.prefetchQuery({
            queryKey: chatKeys.doctorInvites(),
            queryFn: () =>
                new ListPatientInvitesUseCase().execute({ patientId: userId }),
        }),
    ]);
    return (
        <Hydrate client={queryClient}>
            <DoctorsContent />
        </Hydrate>
    );
}

// ── Doctors page (SSR) ────────────────────────────────────────────────────────
export default async function DoctorsPage() {
    const user = await getServerUser();

    if (!user) {
        return (
            <Hydrate client={getQueryClient()}>
                <DoctorsContent />
            </Hydrate>
        );
    }

    return (
        <Suspense fallback={<DoctorsLoading />}>
            <DoctorsData userId={user.uid} />
        </Suspense>
    );
}
