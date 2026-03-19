import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetPatientUseCase, UpsertPatientUseCase } from "@/data/patients";

// GET /api/patients/me — fetch the authenticated user's patient health data
export const GET = WithContext(async ({ user }) => {
  const patient = await new GetPatientUseCase().execute({ userId: user.uid });
  return NextResponse.json(patient ?? { userId: user.uid });
});

// PUT /api/patients/me — upsert health fields for any authenticated user
export const PUT = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;

  await new UpsertPatientUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });

  const patient = await new GetPatientUseCase().execute({ userId: user.uid });
  return NextResponse.json(patient ?? { userId: user.uid });
});
