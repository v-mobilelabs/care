import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetDoctorPatientUseCase } from "@/data/doctor-patients";
import { ListMedicationsUseCase } from "@/data/medications";
import { ListAssessmentsUseCase } from "@/data/assessments";
import { ListLabReportsUseCase } from "@/data/lab-reports";
import { GetProfileUseCase } from "@/data/profile";
import { GetPatientUseCase } from "@/data/patients";

// GET /api/doctor-patients/[patientId]/health-records
// Returns the full health record portfolio for a patient the doctor
// has an accepted consent link with.
export const GET = WithContext(
  { kind: "doctor" },
  async ({ user }, params: { patientId: string }) => {
    const { patientId } = params;

    // ── Verify accepted consent ───────────────────────────────────────────
    const link = await new GetDoctorPatientUseCase().execute({
      doctorId: user.uid,
      patientId,
    });
    if (link?.status !== "accepted") {
      throw ApiError.forbidden(
        "You do not have consent to view this patient\u2019s health records.",
      );
    }

    // ── Fetch all health data in parallel ─────────────────────────────────
    const [medications, assessments, labReports, profile, patient] =
      await Promise.all([
        new ListMedicationsUseCase().execute({ userId: patientId }),
        new ListAssessmentsUseCase().execute({ userId: patientId }),
        new ListLabReportsUseCase().execute({ userId: patientId }),
        new GetProfileUseCase().execute({ userId: patientId }),
        new GetPatientUseCase().execute({ userId: patientId }),
      ]);

    return NextResponse.json({
      patientId,
      patientName: link.patientName ?? profile?.name,
      profile: patient
        ? {
            dateOfBirth: profile?.dateOfBirth,
            sex: patient.sex,
            height: patient.height,
            weight: patient.weight,
            country: profile?.country,
            city: profile?.city,
            foodPreferences: patient.foodPreferences,
          }
        : null,
      medications,
      assessments,
      labReports,
    });
  },
);
