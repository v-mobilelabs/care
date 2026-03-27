import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import { getCachedMedicationsWithFilters } from "@/data/cached";
import { MedicationsContent, type MedicationsInitialFilters } from "./_content";
import MedicationsLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function MedicationsData({
    userId,
    filters,
}: Readonly<{ userId: string; filters: MedicationsInitialFilters }>) {
    const queryClient = getQueryClient();
    const params = new URLSearchParams({ limit: "20" });
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    const qs = params.toString();

    await queryClient.prefetchInfiniteQuery({
        queryKey: [...chatKeys.medications(), "paginated", undefined, qs],
        queryFn: () =>
            getCachedMedicationsWithFilters(userId, {
                status: filters.status && filters.status !== "all" ? filters.status : undefined,
                q: filters.q,
                sortDir: filters.sortDir,
                limit: 20,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof getCachedMedicationsWithFilters>>,
        ) => lastPage.nextCursor ?? undefined,
    });
    return (
        <Hydrate client={queryClient}>
            <MedicationsContent initialFilters={filters} />
        </Hydrate>
    );
}

interface MedicationsPageProps {
    searchParams?: Promise<{ q?: string; status?: string; sortDir?: string }>;
}

function normalizeSortDir(value?: string): "asc" | "desc" {
    if (value === "asc") return "asc";
    return "desc";
}

export default async function MedicationsPage({
    searchParams,
}: Readonly<MedicationsPageProps>) {
    const params = await searchParams;
    const status = params?.status;
    const normalizedStatus =
        status === "active" ||
            status === "paused" ||
            status === "completed" ||
            status === "discontinued"
            ? status
            : "all";
    const filters: MedicationsInitialFilters = {
        q: params?.q?.trim() || undefined,
        status: normalizedStatus,
        sortDir: normalizeSortDir(params?.sortDir),
    };

    const user = await getServerUser();
    if (!user) return <MedicationsContent initialFilters={filters} />;
    return (
        <Suspense fallback={<MedicationsLoading />}>
            <MedicationsData userId={user.uid} filters={filters} />
        </Suspense>
    );
}
