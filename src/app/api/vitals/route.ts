import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListVitalsUseCase, CreateVitalUseCase } from "@/data/vitals";

// GET /api/vitals — list vitals for the authenticated user (or dependent)
export const GET = WithContext(async ({ user, dependentId }) => {
  const input = ListVitalsUseCase.validate({ userId: user.uid });
  const vitals = await new ListVitalsUseCase(dependentId).execute(input);
  return NextResponse.json(vitals);
});

// POST /api/vitals — record a new vital reading
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const input = CreateVitalUseCase.validate({ ...body, userId: user.uid });
  const vital = await new CreateVitalUseCase(dependentId).execute(input);
  return NextResponse.json(vital, { status: 201 });
});
