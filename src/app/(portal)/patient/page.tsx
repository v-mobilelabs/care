import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/chat/_keys";
import { GetPatientProfileUseCase } from "@/data/patients";
import { PatientPageContent } from "./_content";

export default async function PatientPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

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
            <PatientPageContent />
        </Hydrate>
    );
}
