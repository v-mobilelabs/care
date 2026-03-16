import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  ListAssessmentsUseCase,
  CreateAssessmentUseCase,
} from "@/data/assessments";

// GET /api/assessments — list all assessments for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const assessments = await new ListAssessmentsUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(assessments);
});

// POST /api/assessments — create a new assessment
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const assessment = await new CreateAssessmentUseCase(dependentId).execute({
    ...body,
    userId: user.uid,
  });
  return NextResponse.json(assessment, { status: 201 });
});
