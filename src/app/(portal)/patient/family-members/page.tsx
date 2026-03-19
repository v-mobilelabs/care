import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { FamilyMembersContent } from "./_content";
import FamilyMembersLoading from "./loading";

export const metadata = { title: "Family Members" };

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function FamilyMembersData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: chatKeys.dependents(),
        queryFn: async () => {
            const { ListDependentsUseCase } = await import("@/data/dependents");
            return new ListDependentsUseCase().execute({ ownerId: userId });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <FamilyMembersContent />
        </Hydrate>
    );
}

export default async function FamilyMembersPage() {
    const user = await getServerUser();
    if (!user) return <FamilyMembersContent />;
    return (
        <Suspense fallback={<FamilyMembersLoading />}>
            <FamilyMembersData userId={user.uid} />
        </Suspense>
    );
}
