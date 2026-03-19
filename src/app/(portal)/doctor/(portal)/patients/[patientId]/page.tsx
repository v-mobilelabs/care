import { Suspense } from "react";
import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { PatientHealthRecordsContent } from "./_content";
import { redirect } from "next/navigation";
import { Box, Group, Skeleton, Stack } from "@mantine/core";

export const metadata = { title: "Patient Health Records — Doctor Portal" };

function PatientRecordsLoading() {
    return (
        <Box p="md">
            <Group gap="sm" mb="lg">
                <Skeleton circle h={48} w={48} />
                <Stack gap={6}>
                    <Skeleton height={14} width={180} />
                    <Skeleton height={10} width={120} />
                </Stack>
            </Group>
            <Stack gap="sm">
                {["a", "b", "c"].map((k) => (
                    <Skeleton key={k} height={80} radius="lg" />
                ))}
            </Stack>
        </Box>
    );
}

// ── Async data boundary — streams skeleton immediately, data follows ──────────
async function PatientData({
    userId,
    patientId,
}: Readonly<{ userId: string; patientId: string }>) {
    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: ["doctor-patient-health-records", patientId] as const,
        queryFn: async () => {
            const { doctorPatientRepository } = await import("@/data/doctor-patients");
            const { ListConditionsUseCase } = await import("@/data/conditions");
            const { ListSoapNotesUseCase } = await import("@/data/soap-notes");
            const { ListMedicationsUseCase } = await import("@/data/medications");
            const { ListAssessmentsUseCase } = await import("@/data/assessments");
            const { ListLabReportsUseCase } = await import("@/data/lab-reports");
            const { profileRepository } = await import("@/data/profile");
            const { patientRepository } = await import("@/data/patients");

            const link = await doctorPatientRepository.get(userId, patientId);
            if (!link?.status || link.status !== "accepted") return null;

            const [conditions, soapNotes, medications, assessments, labReports, profile, patient] =
                await Promise.all([
                    new ListConditionsUseCase().execute(
                        { userId: patientId },
                    ),
                    new ListSoapNotesUseCase().execute(
                        { userId: patientId },
                    ),
                    new ListMedicationsUseCase().execute(
                        { userId: patientId },
                    ),
                    new ListAssessmentsUseCase().execute(
                        { userId: patientId },
                    ),
                    new ListLabReportsUseCase().execute(
                        { userId: patientId },
                    ),
                    profileRepository.get(patientId),
                    patientRepository.get(patientId),
                ]);

            return {
                patientId,
                patientName: link.patientName ?? profile?.name,
                profile: patient
                    ? {
                        dateOfBirth: patient.dateOfBirth,
                        sex: patient.sex,
                        height: patient.height,
                        weight: patient.weight,
                        country: profile?.country,
                        city: profile?.city,
                        foodPreferences: patient.foodPreferences,
                    }
                    : null,
                conditions,
                soapNotes,
                medications,
                assessments,
                labReports,
            };
        },
    });

    return (
        <Hydrate client={queryClient}>
            <PatientHealthRecordsContent patientId={patientId} />
        </Hydrate>
    );
}

export default async function PatientHealthRecordsPage({
    params,
}: Readonly<{ params: Promise<{ patientId: string }> }>) {
    const [user, { patientId }] = await Promise.all([getServerUser(), params]);

    if (!user) redirect("/auth/login");

    return (
        <Suspense fallback={<PatientRecordsLoading />}>
            <PatientData userId={user.uid} patientId={patientId} />
        </Suspense>
    );
}
