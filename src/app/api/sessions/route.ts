import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateSessionUseCase, ListSessionsUseCase } from "@/data/sessions";

// GET /api/sessions — list sessions for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const input = ListSessionsUseCase.validate({ userId: user.uid });
  const sessions = await new ListSessionsUseCase(dependentId).execute(input);
  return NextResponse.json(sessions);
});

// POST /api/sessions — create a new session
export const POST = WithContext(async ({ user, dependentId, req }) => {
  const body = await req.json().catch(() => ({}));
  const input = CreateSessionUseCase.validate({ userId: user.uid, ...body });
  const session = await new CreateSessionUseCase(dependentId).execute(input);
  return NextResponse.json(session, { status: 201 });
});
