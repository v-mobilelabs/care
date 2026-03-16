import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  CreatePatientSummaryUseCase,
  ListPatientSummariesUseCase,
} from "@/data/patient-summary";

// GET /api/patient-summary — list all summaries for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const summaries = await new ListPatientSummariesUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(summaries);
});

// POST /api/patient-summary — save a generated patient summary
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const summary = await new CreatePatientSummaryUseCase(dependentId).execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(summary, { status: 201 });
});
