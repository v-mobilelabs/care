import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { ListAssessmentsUseCase } from "@/data/assessments";
import { AssessmentsContent } from "./_content";

// ── Assessments page (SSR) ────────────────────────────────────────────────────
// Prefetches assessments server-side so the page renders with data immediately.

export default async function AssessmentsPage() {
    const user = await getServerUser();
    const queryClient = getQueryClient();

    if (user) {
        await queryClient.prefetchQuery({
            queryKey: [...chatKeys.assessments(), undefined],
            queryFn: () =>
                new ListAssessmentsUseCase().execute(
                    { userId: user.uid },
                ),
        });
    }

    return (
        <Hydrate client={queryClient}>
            <AssessmentsContent />
        </Hydrate>
    );
}
