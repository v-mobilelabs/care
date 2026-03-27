import { after, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  ListAllFilesUseCase,
  UploadFileUseCase,
  ClassifyFileUseCase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type FileLabel,
  FILE_LABELS,
} from "@/data/files";
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
  after(async () => {
    await new ClassifyFileUseCase()
      .execute({ fileId, profileId, userId, name, mimeType, buffer })
      .catch((e: unknown) => console.error("[files] classify error:", e));
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
  const sessionId = formData.get("sessionId");
  return {
    file,
    buffer: Buffer.from(await file.arrayBuffer()),
    sessionId: typeof sessionId === "string" ? sessionId : undefined,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/files — paginated list of files for the active profile with optional filters
export const GET = WithContext(async ({ user, profileId, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const labelParam = url.searchParams.get("label") as FileLabel | null;
  const label =
    labelParam && (FILE_LABELS as readonly string[]).includes(labelParam)
      ? labelParam
      : undefined;
  const mimeType = url.searchParams.get("mimeType") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;

  const result = await new ListAllFilesUseCase().execute({
    userId: user.uid,
    profileId,
    ...(cursor && { cursor }),
    ...(limit && { limit }),
    ...(label && { label }),
    ...(mimeType && { mimeType }),
    ...(q && { q }),
    ...(sortDir && { sortDir }),
  });
  return NextResponse.json(result);
});

// POST /api/files — multipart/form-data upload (sessionId in form data)
export const POST = WithContext(async ({ user, profileId, req }) => {
  const { file, buffer, sessionId } = await parseUploadedFile(req);
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
});
