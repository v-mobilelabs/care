import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListVitalsUseCase, CreateVitalUseCase } from "@/data/vitals";

// GET /api/vitals — list vitals for the authenticated user (or dependent)
export const GET = WithContext(async ({ user, dependentId }) => {
  const vitals = await new ListVitalsUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(vitals);
});

// POST /api/vitals — record a new vital reading
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const vital = await new CreateVitalUseCase(dependentId).execute({
    ...body,
    userId: user.uid,
  });
  return NextResponse.json(vital, { status: 201 });
});
