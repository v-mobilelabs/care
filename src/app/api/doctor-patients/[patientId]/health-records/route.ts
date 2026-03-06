import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { doctorPatientRepository } from "@/data/doctor-patients";
import { ListConditionsUseCase } from "@/data/conditions";
import { ListSoapNotesUseCase } from "@/data/soap-notes";
import { ListMedicationsUseCase } from "@/data/medications";
import { ListAssessmentsUseCase } from "@/data/assessments";
import { ListBloodTestsUseCase } from "@/data/blood-tests";
import { profileRepository } from "@/data/profile";

// GET /api/doctor-patients/[patientId]/health-records
// Returns the full health record portfolio for a patient the doctor
// has an accepted consent link with.
export const GET = WithContext(
  { kind: "doctor" },
  async ({ user }, params: { patientId: string }) => {
    const { patientId } = params;

    // ── Verify accepted consent ───────────────────────────────────────────
    const link = await doctorPatientRepository.get(user.uid, patientId);
    if (!link || link.status !== "accepted") {
      throw ApiError.forbidden(
        "You do not have consent to view this patient\u2019s health records.",
      );
    }

    // ── Fetch all health data in parallel ─────────────────────────────────
    const [
      conditions,
      soapNotes,
      medications,
      assessments,
      bloodTests,
      profile,
    ] = await Promise.all([
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

    return NextResponse.json({
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
    });
  },
);
