import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DoctorPatientsContent } from "./_content";

export const metadata = { title: "My Patients — Doctor Portal" };

export default async function DoctorPatientsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: ["doctor-patients"] as const,
            queryFn: async () => {
                const { ListDoctorPatientsUseCase } = await import("@/data/doctor-patients");
                return new ListDoctorPatientsUseCase().execute({ doctorId: user.uid });
            },
        });
    }

    return (
        <Hydrate client={queryClient}>
            <DoctorPatientsContent />
        </Hydrate>
    );
}
