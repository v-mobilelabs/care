import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  GetAssessmentUseCase,
  DeleteAssessmentUseCase,
} from "@/data/assessments";
import { CacheTags } from "@/data/cached";

// GET /api/assessments/[assessmentId]
export const GET = WithContext<{ assessmentId: string }>(
  async ({ user }, { assessmentId }) => {
    const assessment = await new GetAssessmentUseCase().execute({
      userId: user.uid,
      assessmentId,
    });
    if (!assessment) throw ApiError.notFound("Assessment not found.");
    return NextResponse.json(assessment);
  },
);

// DELETE /api/assessments/[assessmentId]
export const DELETE = WithContext<{ assessmentId: string }>(
  async ({ user }, { assessmentId }) => {
    await new DeleteAssessmentUseCase().execute({
      userId: user.uid,
      assessmentId,
    });
    revalidateTag(CacheTags.assessments(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
