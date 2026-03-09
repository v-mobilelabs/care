import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/chat/_keys";
import { ListDoctorsUseCase } from "@/data/doctors";
import { ListPatientInvitesUseCase } from "@/data/doctor-patients";
import { DoctorsContent } from "./_content";

export default async function DoctorsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: [...chatKeys.doctors(), undefined],
                queryFn: () =>
                    new ListDoctorsUseCase().execute(
                        ListDoctorsUseCase.validate({ userId: user.uid }),
                    ),
            }),
            queryClient.prefetchQuery({
                queryKey: chatKeys.doctorInvites(),
                queryFn: () =>
                    new ListPatientInvitesUseCase().execute({ patientId: user.uid }),
            }),
        ]);
    }

    return (
        <Hydrate client={queryClient}>
            <DoctorsContent />
        </Hydrate>
    );
}
