import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { KnowledgeBaseContent } from "./_content";
import KnowledgeBaseLoading from "./loading";

export const metadata = { title: "Knowledge Base — Console" };

// ── Async data boundary ──────────────────────────────────────────────────────

async function KBData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["knowledge-base", "list", {}] as const,
        queryFn: async () => {
            const { ListKnowledgeBaseUseCase } = await import("@/data/knowledge-base");
            return new ListKnowledgeBaseUseCase().execute({ userId, limit: 50 });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <KnowledgeBaseContent />
        </Hydrate>
    );
}

export default async function KnowledgeBasePage() {
    const user = await getServerUser();
    if (!user) return <KnowledgeBaseContent />;
    return (
        <Suspense fallback={<KnowledgeBaseLoading />}>
            <KBData userId={user.uid} />
        </Suspense>
    );
}
