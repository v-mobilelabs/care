import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetFileSignedUrlUseCase } from "@/data/sessions";

// GET /api/files/[fileId] — redirect to a fresh signed download URL
export const GET = WithContext<{ fileId: string }>(
  async ({ user, profileId, dependentId }, { fileId }) => {
    let url: string;
    try {
      url = await new GetFileSignedUrlUseCase().execute({
        userId: user.uid,
        profileId,
        dependentId,
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
  async ({ user, profileId, dependentId }, { fileId }) => {
    let url: string;
    try {
      url = await new GetFileSignedUrlUseCase().execute({
        userId: user.uid,
        profileId,
        dependentId,
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
