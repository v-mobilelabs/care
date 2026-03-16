import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { DoctorPatientsContent } from "./_content";
import { Skeleton, Stack } from "@mantine/core";

export const metadata = { title: "My Patients — Doctor Portal" };

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function PatientsData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery({
        queryKey: ["doctor-patients"] as const,
        queryFn: async () => {
            const { ListDoctorPatientsUseCase } = await import("@/data/doctor-patients");
            return new ListDoctorPatientsUseCase().execute({ doctorId: userId });
        },
    });
    return (
        <Hydrate client={queryClient}>
            <DoctorPatientsContent />
        </Hydrate>
    );
}

function PatientsLoading() {
    return (
        <Stack gap="sm" p="md">
            {["a", "b", "c", "d"].map((k) => (
                <Skeleton key={k} height={64} radius="lg" />
            ))}
        </Stack>
    );
}

export default async function DoctorPatientsPage() {
    const user = await getServerUser();

    if (!user) {
        return (
            <Hydrate client={getQueryClient()}>
                <DoctorPatientsContent />
            </Hydrate>
        );
    }

    return (
        <Suspense fallback={<PatientsLoading />}>
            <PatientsData userId={user.uid} />
        </Suspense>
    );
}
