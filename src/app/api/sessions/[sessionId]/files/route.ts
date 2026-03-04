import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  ListFilesUseCase,
  UploadFileUseCase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/data/sessions";

// GET /api/sessions/[sessionId]/files
export const GET = WithContext<{ sessionId: string }>(
  async ({ user, profileId }, { sessionId }) => {
    const input = ListFilesUseCase.validate({
      userId: user.uid,
      profileId,
      sessionId,
    });
    const files = await new ListFilesUseCase().execute(input);
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

    const input = UploadFileUseCase.validate({
      userId: user.uid,
      profileId,
      sessionId,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    });

    const uploaded = await new UploadFileUseCase().execute(input);
    return NextResponse.json(uploaded, { status: 201 });
  },
);
