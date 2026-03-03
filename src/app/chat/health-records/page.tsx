import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/chat/_keys";
import { ListConditionsUseCase } from "@/data/conditions";
import { ListSoapNotesUseCase } from "@/data/soap-notes";
import { ListMedicationsUseCase } from "@/data/medications";
import { ListAssessmentsUseCase } from "@/data/assessments";
import { profileRepository } from "@/data/profile";
import { HealthRecordsContent } from "./_content";

// ── Health Records page (SSR) ─────────────────────────────────────────────────
// Prefetches all health data server-side so the Overview tab renders with
// data immediately — no loading skeletons on first paint.

export default async function HealthRecordsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.conditions(), undefined],
                queryFn: () =>
                    new ListConditionsUseCase().execute(
                        ListConditionsUseCase.validate({ userId: user.uid }),
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.soapNotes(), undefined],
                queryFn: () =>
                    new ListSoapNotesUseCase().execute(
                        ListSoapNotesUseCase.validate({ userId: user.uid }),
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.medications(), undefined],
                queryFn: () =>
                    new ListMedicationsUseCase().execute(
                        ListMedicationsUseCase.validate({ userId: user.uid }),
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.assessments(), undefined],
                queryFn: () =>
                    new ListAssessmentsUseCase().execute(
                        ListAssessmentsUseCase.validate({ userId: user.uid }),
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: chatKeys.profile(),
                queryFn: async () => {
                    const p = await profileRepository.get(user.uid);
                    return p ?? { userId: user.uid };
                },
            }),
        ]);
    }

    return (
        <Hydrate client={queryClient}>
            <HealthRecordsContent />
        </Hydrate>
    );
}
