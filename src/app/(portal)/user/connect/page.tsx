import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { ListOnlineDoctorsUseCase } from "@/data/meet/use-cases/list-online-doctors.use-case";
import { ConnectContent } from "./_content";
import ConnectLoading from "./loading";

export const metadata = { title: "Connect to a Doctor" };

// ── Async boundary — streams doctor data without blocking the shell ────────

async function ConnectPrefetch() {
    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: ["meet", "doctors"],
        queryFn: () => new ListOnlineDoctorsUseCase().execute(),
    });

    return (
        <Hydrate client={queryClient}>
            <ConnectContent />
        </Hydrate>
    );
}

export default function ConnectPage() {
    return (
        <Suspense fallback={<ConnectLoading />}>
            <ConnectPrefetch />
        </Suspense>
    );
}
