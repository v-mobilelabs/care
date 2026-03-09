import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/chat/_keys";
import { GetPatientProfileUseCase } from "@/data/patients";
import { ProfilePageContent } from "./_content";

/**
 * Shared profile page — renders the correct profile UI based on user kind.
 * Prefetches patient health profile on the server when the user is a patient.
 */
export default async function ProfilePage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    // Pre-load patient health profile only for patient users
    if (user && user.kind !== "doctor") {
        await queryClient.prefetchQuery({
            queryKey: chatKeys.profile(),
            queryFn: () =>
                new GetPatientProfileUseCase().execute(
                    GetPatientProfileUseCase.validate({ userId: user.uid }),
                ),
        });
    }

    return (
        <Hydrate client={queryClient}>
            <ProfilePageContent />
        </Hydrate>
    );
}
