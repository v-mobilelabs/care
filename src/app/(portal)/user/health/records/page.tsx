import { Suspense } from "react";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import { getCachedFilesWithFilters } from "@/data/cached";
import { FilesContent, type FilesInitialFilters } from "./_content";

function normalizeSortDir(value?: string): "asc" | "desc" {
    if (value === "asc") return "asc";
    return "desc";
}

function normalizeLabel(value?: string): FilesInitialFilters["label"] {
    if (value === "xray") return "xray";
    if (value === "blood_test") return "blood_test";
    if (value === "prescription") return "prescription";
    if (value === "scan") return "scan";
    if (value === "report") return "report";
    if (value === "vaccination") return "vaccination";
    if (value === "other") return "other";
    return undefined;
}

function buildFilesQueryString(filters: FilesInitialFilters): string {
    const params = new URLSearchParams();
    if (filters.label) params.set("label", filters.label);
    if (filters.q) params.set("q", filters.q);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    return params.toString();
}

async function FilesData({
    userId,
    filters,
}: Readonly<{ userId: string; filters: FilesInitialFilters }>) {
    const queryClient = getQueryClient();
    const qs = buildFilesQueryString(filters);

    await queryClient.prefetchInfiniteQuery({
        queryKey: [...chatKeys.files(), qs],
        queryFn: () =>
            getCachedFilesWithFilters(userId, {
                label: filters.label,
                q: filters.q,
                sortDir: filters.sortDir,
                limit: 20,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof getCachedFilesWithFilters>>,
        ) => lastPage.nextCursor ?? undefined,
    });

    return (
        <Hydrate client={queryClient}>
            <FilesContent initialFilters={filters} />
        </Hydrate>
    );
}

interface FilesPageProps {
    searchParams?: Promise<{ label?: string; q?: string; sortDir?: string }>;
}

export default async function FilesPage({ searchParams }: Readonly<FilesPageProps>) {
    const params = await searchParams;
    const filters: FilesInitialFilters = {
        label: normalizeLabel(params?.label),
        q: params?.q?.trim() || undefined,
        sortDir: normalizeSortDir(params?.sortDir),
    };

    const user = await getServerUser();
    if (!user) return <FilesContent initialFilters={filters} />;

    return (
        <Suspense fallback={<FilesContent initialFilters={filters} />}>
            <FilesData userId={user.uid} filters={filters} />
        </Suspense>
    );
}
