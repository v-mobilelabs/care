import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/chat/_keys";
import { ListDoctorsUseCase } from "@/data/doctors";
import { DoctorsContent } from "./_content";

export default async function DoctorsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: [...chatKeys.doctors(), undefined],
            queryFn: () =>
                new ListDoctorsUseCase().execute(
                    ListDoctorsUseCase.validate({ userId: user.uid }),
                ),
        });
    }

    return (
        <Hydrate client={queryClient}>
            <DoctorsContent />
        </Hydrate>
    );
}
