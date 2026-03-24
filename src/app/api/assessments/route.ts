import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  ListAssessmentsUseCase,
  CreateAssessmentUseCase,
} from "@/data/assessments";
import { CacheTags } from "@/data/cached";

// GET /api/assessments — list all assessments for the authenticated user
export const GET = WithContext(async ({ user, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const status =
    (url.searchParams.get("status") as
      | "active"
      | "completed"
      | "abandoned"
      | null) ?? undefined;
  const riskLevel =
    (url.searchParams.get("riskLevel") as
      | "low"
      | "moderate"
      | "high"
      | "emergency"
      | null) ?? undefined;
  const agent = url.searchParams.get("agent") ?? undefined;
  const sortBy =
    (url.searchParams.get("sortBy") as
      | "createdAt"
      | "title"
      | "updatedAt"
      | null) ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const assessments = await new ListAssessmentsUseCase().execute({
    userId: user.uid,
    ...(cursor ? { cursor } : {}),
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(riskLevel ? { riskLevel } : {}),
    ...(agent ? { agent } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortDir ? { sortDir } : {}),
    ...(limit ? { limit } : {}),
  });
  return NextResponse.json(assessments);
});

// POST /api/assessments — create a new assessment
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const assessment = await new CreateAssessmentUseCase().execute({
    ...body,
    userId: user.uid,
  });
  revalidateTag(CacheTags.assessments(user.uid), "minutes");
  return NextResponse.json(assessment, { status: 201 });
});
