import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { ConnectContent } from "./_content";

export const metadata = { title: "Connect to a Doctor" };

export default async function ConnectPage() {
    const queryClient = getQueryClient();

    // Prefetch available doctors on the server
    await queryClient.prefetchQuery({
        queryKey: ["meet", "doctors"],
        queryFn: async () => {
            const { ListOnlineDoctorsUseCase } = await import(
                "@/data/meet/use-cases/list-online-doctors.use-case"
            );
            return new ListOnlineDoctorsUseCase().execute();
        },
    });

    return (
        <Hydrate client={queryClient}>
            <ConnectContent />
        </Hydrate>
    );
}
