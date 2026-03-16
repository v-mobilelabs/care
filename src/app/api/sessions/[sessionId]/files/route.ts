import { after } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  ListFilesUseCase,
  UploadFileUseCase,
  ClassifyFileUseCase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/data/sessions";
import { CacheTags } from "@/data/cached";

// GET /api/sessions/[sessionId]/files
export const GET = WithContext<{ sessionId: string }>(
  async ({ user, profileId }, { sessionId }) => {
    const files = await new ListFilesUseCase().execute({
      userId: user.uid,
      profileId,
      sessionId,
    });
    return NextResponse.json(files);
  },
);

// POST /api/sessions/[sessionId]/files — multipart/form-data upload
export const POST = WithContext<{ sessionId: string }>(
  async ({ user, profileId, req }, { sessionId }) => {
    const formData = await req.formData().catch(() => null);
    if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");

    const file = formData.get("file");
    if (!(file instanceof File))
      throw ApiError.badRequest("'file' field is required.");

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw ApiError.badRequest(
        `Unsupported file type '${file.type}'. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}.`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw ApiError.badRequest(
        `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await new UploadFileUseCase().execute({
      userId: user.uid,
      profileId,
      sessionId,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    });

    revalidateTag(CacheTags.files(user.uid), "minutes");

    after(async () => {
      await new ClassifyFileUseCase()
        .execute({
          fileId: uploaded.id,
          profileId,
          userId: user.uid,
          name: file.name,
          mimeType: file.type,
          buffer,
        })
        .catch((err: unknown) => {
          console.error("[POST /api/sessions/files] classify error:", err);
        });
      // Re-invalidate after classification updates the file's label.
      revalidateTag(CacheTags.files(user.uid), "minutes");
    });

    return NextResponse.json(uploaded, { status: 201 });
  },
);
