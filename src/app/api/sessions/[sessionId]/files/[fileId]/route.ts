import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileUseCase, DeleteFileUseCase } from "@/data/sessions";
import { CacheTags } from "@/data/cached";

// GET /api/sessions/[sessionId]/files/[fileId] — returns metadata + fresh signed URL
export const GET = WithContext<{ sessionId: string; fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    const file = await new GetFileUseCase().execute({
      userId: user.uid,
      profileId,
      fileId,
    });
    if (!file) throw ApiError.notFound("File not found.");
    return NextResponse.json(file);
  },
);

// DELETE /api/sessions/[sessionId]/files/[fileId]
export const DELETE = WithContext<{ sessionId: string; fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    await new DeleteFileUseCase().execute({
      userId: user.uid,
      profileId,
      fileId,
    });
    revalidateTag(CacheTags.files(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
