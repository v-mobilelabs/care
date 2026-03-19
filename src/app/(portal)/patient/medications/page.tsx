import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListMedicationsUseCase } from "@/data/medications";
import { MedicationsContent } from "./_content";
import MedicationsLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function MedicationsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.medications(), undefined],
        queryFn: () =>
            new ListMedicationsUseCase().execute({ userId }),
    });
    return (
        <Hydrate client={queryClient}>
            <MedicationsContent />
        </Hydrate>
    );
}

export default async function MedicationsPage() {
    const user = await getServerUser();
    if (!user) return <MedicationsContent />;
    return (
        <Suspense fallback={<MedicationsLoading />}>
            <MedicationsData userId={user.uid} />
        </Suspense>
    );
}
