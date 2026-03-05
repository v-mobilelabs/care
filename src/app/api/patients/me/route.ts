import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { patientRepository, UpsertPatientSchema } from "@/data/patients";

// GET /api/patients/me — fetch the authenticated user's patient health data
export const GET = WithContext({}, async ({ user }) => {
  const patient = await patientRepository.get(user.uid);
  return NextResponse.json(patient ?? { userId: user.uid });
});

// PUT /api/patients/me — upsert health fields for any authenticated user
export const PUT = WithContext({}, async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = UpsertPatientSchema.parse(body);

  await patientRepository.upsert({
    userId: user.uid,
    dateOfBirth: input.dateOfBirth,
    sex: input.sex,
    height: input.height,
    weight: input.weight,
    waistCm: input.waistCm,
    neckCm: input.neckCm,
    hipCm: input.hipCm,
    activityLevel: input.activityLevel,
    foodPreferences: input.foodPreferences,
    consentedAt: input.consentedAt,
  });

  const patient = await patientRepository.get(user.uid);
  return NextResponse.json(patient ?? { userId: user.uid });
});
