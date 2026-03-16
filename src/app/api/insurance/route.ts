import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateInsuranceUseCase, ListInsuranceUseCase } from "@/data/insurance";

// GET /api/insurance — list all insurance records for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const records = await new ListInsuranceUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(records);
});

// POST /api/insurance — add a new insurance record
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const record = await new CreateInsuranceUseCase(dependentId).execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(record, { status: 201 });
});
