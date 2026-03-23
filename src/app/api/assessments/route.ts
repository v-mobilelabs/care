import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  ListAssessmentsUseCase,
  CreateAssessmentUseCase,
} from "@/data/assessments";
import { CacheTags } from "@/data/cached";

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
  revalidateTag(CacheTags.assessments(user.uid), "minutes");
  return NextResponse.json(assessment, { status: 201 });
});
