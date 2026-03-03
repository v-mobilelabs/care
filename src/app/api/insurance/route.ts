import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateInsuranceUseCase, ListInsuranceUseCase } from "@/data/insurance";

// GET /api/insurance — list all insurance records for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const input = ListInsuranceUseCase.validate({ userId: user.uid });
  const records = await new ListInsuranceUseCase(dependentId).execute(input);
  return NextResponse.json(records);
});

// POST /api/insurance — add a new insurance record
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const input = CreateInsuranceUseCase.validate({
    ...(body as object),
    userId: user.uid,
  });
  const record = await new CreateInsuranceUseCase(dependentId).execute(input);
  return NextResponse.json(record, { status: 201 });
});
