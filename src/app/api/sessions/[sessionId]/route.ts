import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  GetSessionUseCase,
  UpdateSessionUseCase,
  DeleteSessionUseCase,
} from "@/data/sessions";

// GET /api/sessions/[sessionId]
export const GET = WithContext<{ sessionId: string }>(
  async ({ user, profileId }, { sessionId }) => {
    const input = GetSessionUseCase.validate({
      userId: user.uid,
      profileId,
      sessionId,
    });
    const session = await new GetSessionUseCase().execute(input);
    if (!session) throw ApiError.notFound("Session not found.");
    return NextResponse.json(session);
  },
);

// PATCH /api/sessions/[sessionId] — update title
export const PATCH = WithContext<{ sessionId: string }>(
  async ({ user, profileId, req }, { sessionId }) => {
    const body = await req.json().catch(() => ({}));
    const input = UpdateSessionUseCase.validate({
      userId: user.uid,
      profileId,
      sessionId,
      ...body,
    });
    const session = await new UpdateSessionUseCase().execute(input);
    if (!session) throw ApiError.notFound("Session not found.");
    return NextResponse.json(session);
  },
);

// DELETE /api/sessions/[sessionId] — cascade deletes messages + files
export const DELETE = WithContext<{ sessionId: string }>(
  async ({ user, profileId }, { sessionId }) => {
    const input = DeleteSessionUseCase.validate({
      userId: user.uid,
      profileId,
      sessionId,
    });
    await new DeleteSessionUseCase().execute(input);
    return NextResponse.json({ ok: true });
  },
);
