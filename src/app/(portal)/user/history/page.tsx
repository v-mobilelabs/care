import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import { getCachedSessionsWithFilters } from "@/data/cached";
import { HistoryContent, type HistoryInitialFilters } from "./_content";
import HistoryLoading from "./loading";

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function HistoryData({
    userId,
    filters,
}: Readonly<{ userId: string; filters: HistoryInitialFilters }>) {
    const queryClient = getQueryClient();
    const params = new URLSearchParams({ limit: "20" });
    if (filters.agent && filters.agent !== "all") params.set("agent", filters.agent);
    if (filters.q) params.set("q", filters.q);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    const qs = params.toString();

    await queryClient.prefetchInfiniteQuery({
        queryKey: [...chatKeys.sessions(), "paginated", undefined, qs],
        queryFn: () =>
            getCachedSessionsWithFilters(userId, {
                agent: filters.agent && filters.agent !== "all" ? filters.agent : undefined,
                q: filters.q,
                sortDir: filters.sortDir,
                limit: 20,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof getCachedSessionsWithFilters>>,
        ) => lastPage.nextCursor ?? undefined,
    });
    return (
        <Hydrate client={queryClient}>
            <HistoryContent initialFilters={filters} />
        </Hydrate>
    );
}

// ── History page (SSR) ────────────────────────────────────────────────────────
interface HistoryPageProps {
    searchParams?: Promise<{ q?: string; agent?: string; sortDir?: string }>;
}

function normalizeSortDir(value?: string): "asc" | "desc" {
    if (value === "asc") return "asc";
    return "desc";
}

export default async function HistoryPage({
    searchParams,
}: Readonly<HistoryPageProps>) {
    const params = await searchParams;
    const filters: HistoryInitialFilters = {
        q: params?.q?.trim() || undefined,
        agent: params?.agent && params.agent !== "all" ? params.agent : "all",
        sortDir: normalizeSortDir(params?.sortDir),
    };

    const user = await getServerUser();
    if (!user) return <HistoryContent initialFilters={filters} />;
    return (
        <Suspense fallback={<HistoryLoading />}>
            <HistoryData userId={user.uid} filters={filters} />
        </Suspense>
    );
}
