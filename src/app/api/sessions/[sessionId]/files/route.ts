import { after } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  ListFilesUseCase,
  UploadFileUseCase,
  ClassifyFileUseCase,
  GenerateThumbnailUseCase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/data/sessions";
import { CacheTags } from "@/data/cached";

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateFile(file: File) {
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
}

function schedulePostProcessing(
  fileId: string,
  profileId: string,
  userId: string,
  name: string,
  mimeType: string,
  buffer: Buffer,
) {
  const classify = new ClassifyFileUseCase()
    .execute({ fileId, profileId, userId, name, mimeType, buffer })
    .catch((e: unknown) => console.error("[files] classify error:", e));
  const thumbnail = new GenerateThumbnailUseCase()
    .execute({ fileId, profileId, mimeType, buffer })
    .catch((e: unknown) => console.error("[files] thumbnail error:", e));

  after(async () => {
    await Promise.all([classify, thumbnail]);
    revalidateTag(CacheTags.files(userId), "minutes");
  });
}

async function parseUploadedFile(req: Request) {
  const formData = await req.formData().catch(() => null);
  if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");
  const file = formData.get("file");
  if (!(file instanceof File))
    throw ApiError.badRequest("'file' field is required.");
  validateFile(file);
  return { file, buffer: Buffer.from(await file.arrayBuffer()) };
}

// ── Routes ────────────────────────────────────────────────────────────────────

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
    const { file, buffer } = await parseUploadedFile(req);
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
    schedulePostProcessing(
      uploaded.id,
      profileId,
      user.uid,
      file.name,
      file.type,
      buffer,
    );

    return NextResponse.json(uploaded, { status: 201 });
  },
);
