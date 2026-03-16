import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  GetAssessmentUseCase,
  DeleteAssessmentUseCase,
} from "@/data/assessments";

// GET /api/assessments/[assessmentId]
export const GET = WithContext<{ assessmentId: string }>(
  async ({ user, dependentId }, { assessmentId }) => {
    const assessment = await new GetAssessmentUseCase(dependentId).execute({
      userId: user.uid,
      assessmentId,
    });
    if (!assessment) throw ApiError.notFound("Assessment not found.");
    return NextResponse.json(assessment);
  },
);

// DELETE /api/assessments/[assessmentId]
export const DELETE = WithContext<{ assessmentId: string }>(
  async ({ user, dependentId }, { assessmentId }) => {
    await new DeleteAssessmentUseCase(dependentId).execute({
      userId: user.uid,
      assessmentId,
    });
    return NextResponse.json({ ok: true });
  },
);
