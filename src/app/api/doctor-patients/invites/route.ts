import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListPatientInvitesUseCase } from "@/data/doctor-patients";

// GET /api/doctor-patients/invites — patient sees all their doctor invites
export const GET = WithContext(async ({ user }) => {
  const invites = await new ListPatientInvitesUseCase().execute({
    patientId: user.uid,
  });
  return NextResponse.json(invites);
});
