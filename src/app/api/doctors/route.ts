import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateDoctorUseCase, ListDoctorsUseCase } from "@/data/doctors";

// GET /api/doctors — list all doctors for the authenticated user
export const GET = WithContext(async ({ user }) => {
  const doctors = await new ListDoctorsUseCase().execute({ userId: user.uid });
  return NextResponse.json(doctors);
});

// POST /api/doctors — save a new doctor
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const doctor = await new CreateDoctorUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(doctor, { status: 201 });
});
