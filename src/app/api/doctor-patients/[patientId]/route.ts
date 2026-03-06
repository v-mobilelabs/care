import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { RevokePatientUseCase } from "@/data/doctor-patients";

// DELETE /api/doctor-patients/[patientId] — revoke patient access
export const DELETE = WithContext(
  { kind: "doctor" },
  async ({ user }, params: { patientId: string }) => {
    const input = RevokePatientUseCase.validate({
      doctorId: user.uid,
      patientId: params.patientId,
    });
    await new RevokePatientUseCase().execute(input);
    return NextResponse.json({ success: true });
  },
);
