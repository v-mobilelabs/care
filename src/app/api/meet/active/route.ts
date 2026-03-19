import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetActiveMeetForDoctorUseCase } from "@/data/meet";

// GET /api/meet/active — returns the doctor's current active call (if any)
export const GET = WithContext({ kind: "doctor" }, async ({ user }) => {
  const active = await new GetActiveMeetForDoctorUseCase().execute({
    doctorId: user.uid,
  });
  return NextResponse.json(active);
});
