import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  GetPatientUseCase,
  UpsertPatientUseCase,
  UpsertPatientSchema,
} from "@/data/patients";

// GET /api/patients/me — fetch the authenticated user's patient health data
export const GET = WithContext({}, async ({ user }) => {
  const input = GetPatientUseCase.validate({ userId: user.uid });
  const patient = await new GetPatientUseCase().execute(input);
  return NextResponse.json(patient ?? { userId: user.uid });
});

// PUT /api/patients/me — upsert health fields for any authenticated user
export const PUT = WithContext({}, async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const parsedBody = UpsertPatientSchema.parse(body);

  const input = UpsertPatientUseCase.validate({
    userId: user.uid,
    dateOfBirth: parsedBody.dateOfBirth,
    sex: parsedBody.sex,
    height: parsedBody.height,
    weight: parsedBody.weight,
    bloodGroup: parsedBody.bloodGroup,
    waistCm: parsedBody.waistCm,
    neckCm: parsedBody.neckCm,
    hipCm: parsedBody.hipCm,
    activityLevel: parsedBody.activityLevel,
    foodPreferences: parsedBody.foodPreferences,
    consentedAt: parsedBody.consentedAt,
  });
  await new UpsertPatientUseCase().execute(input);

  const getInput = GetPatientUseCase.validate({ userId: user.uid });
  const patient = await new GetPatientUseCase().execute(getInput);
  return NextResponse.json(patient ?? { userId: user.uid });
});
