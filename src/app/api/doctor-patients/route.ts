import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  InvitePatientUseCase,
  ListDoctorPatientsUseCase,
} from "@/data/doctor-patients";
import type { DoctorPatientStatus } from "@/data/doctor-patients";

// GET /api/doctor-patients?status=pending|accepted|revoked
export const GET = WithContext({ kind: "doctor" }, async ({ user, req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as DoctorPatientStatus | null;

  const input = ListDoctorPatientsUseCase.validate({
    doctorId: user.uid,
    ...(status ? { status } : {}),
  });
  const patients = await new ListDoctorPatientsUseCase().execute(input);
  return NextResponse.json(patients);
});

// POST /api/doctor-patients — invite a patient
export const POST = WithContext({ kind: "doctor" }, async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = InvitePatientUseCase.validate({
    ...(body as object),
    doctorId: user.uid,
  });
  const result = await new InvitePatientUseCase().execute(input);
  return NextResponse.json(result, { status: 201 });
});
