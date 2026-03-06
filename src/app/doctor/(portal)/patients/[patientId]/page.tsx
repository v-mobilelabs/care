import { Hydrate } from "@/ui/hydrate";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { PatientHealthRecordsContent } from "./_content";
import { redirect } from "next/navigation";

export const metadata = { title: "Patient Health Records — Doctor Portal" };

export default async function PatientHealthRecordsPage({
    params,
}: Readonly<{ params: Promise<{ patientId: string }> }>) {
    const [user, { patientId }] = await Promise.all([getServerUser(), params]);

    if (!user) redirect("/auth/login");

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery({
        queryKey: ["doctor-patient-health-records", patientId] as const,
        queryFn: async () => {
            const { doctorPatientRepository } = await import("@/data/doctor-patients");
            const { ListConditionsUseCase } = await import("@/data/conditions");
            const { ListSoapNotesUseCase } = await import("@/data/soap-notes");
            const { ListMedicationsUseCase } = await import("@/data/medications");
            const { ListAssessmentsUseCase } = await import("@/data/assessments");
            const { ListBloodTestsUseCase } = await import("@/data/blood-tests");
            const { profileRepository } = await import("@/data/profile");

            const link = await doctorPatientRepository.get(user.uid, patientId);
            if (!link || link.status !== "accepted") return null;

            const [conditions, soapNotes, medications, assessments, bloodTests, profile] =
                await Promise.all([
                    new ListConditionsUseCase().execute(
                        ListConditionsUseCase.validate({ userId: patientId }),
                    ),
                    new ListSoapNotesUseCase().execute(
                        ListSoapNotesUseCase.validate({ userId: patientId }),
                    ),
                    new ListMedicationsUseCase().execute(
                        ListMedicationsUseCase.validate({ userId: patientId }),
                    ),
                    new ListAssessmentsUseCase().execute(
                        ListAssessmentsUseCase.validate({ userId: patientId }),
                    ),
                    new ListBloodTestsUseCase().execute(
                        ListBloodTestsUseCase.validate({ userId: patientId }),
                    ),
                    profileRepository.get(patientId),
                ]);

            return {
                patientId,
                patientName: link.patientName ?? profile?.name,
                profile: profile
                    ? {
                        dateOfBirth: profile.dateOfBirth,
                        sex: profile.sex,
                        height: profile.height,
                        weight: profile.weight,
                        country: profile.country,
                        city: profile.city,
                        foodPreferences: profile.foodPreferences,
                    }
                    : null,
                conditions,
                soapNotes,
                medications,
                assessments,
                bloodTests,
            };
        },
    });

    return (
        <Hydrate client={queryClient}>
            <PatientHealthRecordsContent patientId={patientId} />
        </Hydrate>
    );
}
