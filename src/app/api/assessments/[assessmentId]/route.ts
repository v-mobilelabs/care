import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  GetAssessmentUseCase,
  DeleteAssessmentUseCase,
} from "@/data/assessments";

// GET /api/assessments/[assessmentId]
export const GET = WithContext<{ assessmentId: string }>(
  async ({ user, dependentId }, { assessmentId }) => {
    const input = GetAssessmentUseCase.validate({
      userId: user.uid,
      assessmentId,
    });
    const assessment = await new GetAssessmentUseCase(dependentId).execute(
      input,
    );
    if (!assessment) throw ApiError.notFound("Assessment not found.");
    return NextResponse.json(assessment);
  },
);

// DELETE /api/assessments/[assessmentId]
export const DELETE = WithContext<{ assessmentId: string }>(
  async ({ user, dependentId }, { assessmentId }) => {
    const input = DeleteAssessmentUseCase.validate({
      userId: user.uid,
      assessmentId,
    });
    await new DeleteAssessmentUseCase(dependentId).execute(input);
    return NextResponse.json({ ok: true });
  },
);
