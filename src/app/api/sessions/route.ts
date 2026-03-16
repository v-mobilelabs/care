import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateSessionUseCase, ListSessionsUseCase } from "@/data/sessions";

// GET /api/sessions — list sessions for the authenticated user
export const GET = WithContext(async ({ user, profileId }) => {
  const sessions = await new ListSessionsUseCase().execute({
    userId: user.uid,
    profileId,
  });
  return NextResponse.json(sessions);
});

// POST /api/sessions — create a new session
export const POST = WithContext(async ({ user, profileId, req }) => {
  const body = await req.json().catch(() => ({}));
  const session = await new CreateSessionUseCase().execute({
    userId: user.uid,
    profileId,
    ...body,
  });
  return NextResponse.json(session, { status: 201 });
});
