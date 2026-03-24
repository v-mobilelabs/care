import { WithContext, ApiError } from "@/lib/api/with-context";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { GetFileSignedUrlUseCase, DeleteFileUseCase } from "@/data/files";
import { CacheTags } from "@/data/cached";

// GET /api/files/[fileId] — redirect to a fresh signed download URL
export const GET = WithContext<{ fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    let url: string;
    try {
      url = await new GetFileSignedUrlUseCase().execute({
        userId: user.uid,
        profileId,
        fileId,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "FILE_NOT_FOUND") {
        throw ApiError.notFound("File not found.");
      }
      throw e;
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, max-age=3000, stale-while-revalidate=600",
      },
    });
  },
);

// POST /api/files/[fileId] — return the signed URL as JSON
export const POST = WithContext<{ fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    let url: string;
    try {
      url = await new GetFileSignedUrlUseCase().execute({
        userId: user.uid,
        profileId,
        fileId,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "FILE_NOT_FOUND") {
        throw ApiError.notFound("File not found.");
      }
      throw e;
    }

    return Response.json(
      { url },
      {
        headers: {
          "Cache-Control": "private, max-age=3000, stale-while-revalidate=600",
        },
      },
    );
  },
);

// DELETE /api/files/[fileId] — delete a file
export const DELETE = WithContext<{ fileId: string }>(
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
