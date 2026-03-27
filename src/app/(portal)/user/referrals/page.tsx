import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import {
    getCachedReferralsWithFilters,
    type CachedReferralsFilters,
} from "@/data/cached";
import {
    buildReferralListQueryString,
    type ReferralSortDir,
    type ReferralStatus,
} from "@/data/referrals";
import { ReferralsContent, type ReferralsInitialFilters } from "./_content";
import ReferralsLoading from "./loading";

// ── Async data boundary ───────────────────────────────────────────────────────

async function ReferralsData({
    userId,
    filters,
}: Readonly<{ userId: string; filters: ReferralsInitialFilters }>) {
    const queryClient = getQueryClient();
    const initialQuery = buildReferralListQueryString({
        status: filters.status,
        q: filters.q,
        sortDir: filters.sortDir,
        limit: 20,
    });
    const cachedFilters: CachedReferralsFilters = {
        status: filters.status,
        q: filters.q,
        sortDir: filters.sortDir,
        limit: 20,
    };
    await queryClient.prefetchInfiniteQuery({
        queryKey: [...chatKeys.referrals(), "paginated", userId, initialQuery],
        queryFn: () => getCachedReferralsWithFilters(userId, cachedFilters),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof getCachedReferralsWithFilters>>,
        ) => lastPage.nextCursor ?? undefined,
    });
    return (
        <Hydrate client={queryClient}>
            <ReferralsContent initialFilters={filters} />
        </Hydrate>
    );
}

// ── Referrals page (SSR) ──────────────────────────────────────────────────────

interface ReferralsPageProps {
    searchParams?: Promise<{
        status?: string;
        q?: string;
        sortDir?: string;
    }>;
}

function normalizeStatus(value?: string): ReferralStatus | undefined {
    if (!value) return undefined;
    if (value === "pending") return "pending";
    if (value === "accepted") return "accepted";
    if (value === "dismissed") return "dismissed";
    if (value === "completed") return "completed";
    return undefined;
}

function normalizeSortDir(value?: string): ReferralSortDir {
    if (value === "asc") return "asc";
    return "desc";
}

export default async function ReferralsPage({
    searchParams,
}: Readonly<ReferralsPageProps>) {
    const params = await searchParams;
    const filters: ReferralsInitialFilters = {
        status: normalizeStatus(params?.status),
        q: params?.q?.trim() || undefined,
        sortDir: normalizeSortDir(params?.sortDir),
    };

    const user = await getServerUser();
    if (!user) return <ReferralsContent initialFilters={filters} />;
    return (
        <Suspense fallback={<ReferralsLoading />}>
            <ReferralsData userId={user.uid} filters={filters} />
        </Suspense>
    );
}
