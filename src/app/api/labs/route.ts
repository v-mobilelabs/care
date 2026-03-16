import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListLabsUseCase, CreateLabUseCase } from "@/data/labs";

// GET /api/labs — list lab results for the authenticated user (or dependent)
export const GET = WithContext(async ({ user, dependentId }) => {
  const labs = await new ListLabsUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(labs);
});

// POST /api/labs — record new lab results
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const lab = await new CreateLabUseCase(dependentId).execute({
    ...body,
    userId: user.uid,
  });
  return NextResponse.json(lab, { status: 201 });
});
