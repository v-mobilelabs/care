import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListMedicationsUseCase } from "@/data/medications";
import { MedicationsContent } from "./_content";

export default async function MedicationsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: [...chatKeys.medications(), undefined],
            queryFn: () =>
                new ListMedicationsUseCase().execute(
                    ListMedicationsUseCase.validate({ userId: user.uid }),
                ),
        });
    }

    return (
        <Hydrate client={queryClient}>
            <MedicationsContent />
        </Hydrate>
    );
}
