import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/sessions";

// GET /api/sessions/[sessionId]/files/[fileId] — returns metadata + fresh signed URL
export const GET = WithContext<{ sessionId: string; fileId: string }>(
  async ({ user }, { sessionId, fileId }) => {
    const input = GetFileUseCase.validate({
      userId: user.uid,
      sessionId,
      fileId,
    });
    const file = await new GetFileUseCase().execute(input);
    if (!file) throw ApiError.notFound("File not found.");
    return NextResponse.json(file);
  },
);

// DELETE /api/sessions/[sessionId]/files/[fileId]
export const DELETE = WithContext<{ sessionId: string; fileId: string }>(
  async ({ user }, { sessionId, fileId }) => {
    const input = DeleteFileUseCase.validate({
      userId: user.uid,
      sessionId,
      fileId,
    });
    await new DeleteFileUseCase().execute(input);
    return NextResponse.json({ ok: true });
  },
);
