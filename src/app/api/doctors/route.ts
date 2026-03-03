import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateDoctorUseCase, ListDoctorsUseCase } from "@/data/doctors";

// GET /api/doctors — list all doctors for the authenticated user
export const GET = WithContext(async ({ user }) => {
  const input = ListDoctorsUseCase.validate({ userId: user.uid });
  const doctors = await new ListDoctorsUseCase().execute(input);
  return NextResponse.json(doctors);
});

// POST /api/doctors — save a new doctor
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = CreateDoctorUseCase.validate({
    ...(body as object),
    userId: user.uid,
  });
  const doctor = await new CreateDoctorUseCase().execute(input);
  return NextResponse.json(doctor, { status: 201 });
});
