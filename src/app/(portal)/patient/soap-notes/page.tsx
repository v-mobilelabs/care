import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListConditionsUseCase } from "@/data/conditions";
import { ListSoapNotesUseCase } from "@/data/soap-notes";
import { HealthRecordsContent } from "./_content";
import SoapNotesLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function HealthRecordsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.conditions(), undefined],
            queryFn: () =>
                new ListConditionsUseCase().execute({ userId }),
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.soapNotes(), undefined],
            queryFn: () =>
                new ListSoapNotesUseCase().execute({ userId }),
        }),
    ]);
    return (
        <Hydrate client={queryClient}>
            <HealthRecordsContent />
        </Hydrate>
    );
}

// ── Health Records page (SSR) ─────────────────────────────────────────────────
export default async function HealthRecordsPage() {
    const user = await getServerUser();
    if (!user) return <HealthRecordsContent />;
    return (
        <Suspense fallback={<SoapNotesLoading />}>
            <HealthRecordsData userId={user.uid} />
        </Suspense>
    );
}
