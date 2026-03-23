import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { GetPatientUseCase, UpsertPatientUseCase } from "@/data/patients";
import { CacheTags } from "@/data/cached";

// GET /api/patients/me — fetch the authenticated user's patient health data
export const GET = WithContext(async ({ user }) => {
  const patient = await new GetPatientUseCase().execute({ userId: user.uid });
  return NextResponse.json(patient ?? { userId: user.uid });
});

// PUT /api/patients/me — upsert health fields for any authenticated user
export const PUT = WithContext(async ({ user, req }) => {
  const body = await req.json();

  const patient = await new UpsertPatientUseCase().execute({
    ...body,
    userId: user.uid,
  });

  revalidateTag(CacheTags.patient(user.uid), "minutes");
  return NextResponse.json(patient);
});
