import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListAssessmentsUseCase } from "@/data/assessments";
import { AssessmentsContent } from "./_content";
import AssessmentsLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function AssessmentsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: [...chatKeys.assessments(), undefined],
        queryFn: () =>
            new ListAssessmentsUseCase().execute({ userId }),
    });
    return (
        <Hydrate client={queryClient}>
            <AssessmentsContent />
        </Hydrate>
    );
}

// ── Assessments page (SSR) ────────────────────────────────────────────────────
export default async function AssessmentsPage() {
    const user = await getServerUser();
    if (!user) return <AssessmentsContent />;
    return (
        <Suspense fallback={<AssessmentsLoading />}>
            <AssessmentsData userId={user.uid} />
        </Suspense>
    );
}
