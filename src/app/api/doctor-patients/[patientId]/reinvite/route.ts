import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ReinvitePatientUseCase } from "@/data/doctor-patients";

// POST /api/doctor-patients/[patientId]/reinvite — re-send a pending invite
export const POST = WithContext(
  { kind: "doctor" },
  async ({ user }, params: { patientId: string }) => {
    const input = ReinvitePatientUseCase.validate({
      doctorId: user.uid,
      patientId: params.patientId,
    });
    const result = await new ReinvitePatientUseCase().execute(input);
    return NextResponse.json(result);
  },
);
