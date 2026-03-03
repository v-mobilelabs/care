import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  ListFilesUseCase,
  UploadFileUseCase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/data/sessions";

/** Virtual session ID used to namespace prescription files in Firestore/GCS. */
export const PRESCRIPTIONS_SESSION_ID = "prescriptions";

/** Returns the Firestore session ID for prescriptions scoped to the active profile. */
export function getPrescriptionSessionId(dependentId?: string): string {
  return dependentId
    ? `prescriptions__${dependentId}`
    : PRESCRIPTIONS_SESSION_ID;
}

// GET /api/prescriptions — list all prescription files for the current user
export const GET = WithContext(async ({ user, dependentId }) => {
  const input = ListFilesUseCase.validate({
    userId: user.uid,
    sessionId: getPrescriptionSessionId(dependentId),
  });
  const files = await new ListFilesUseCase().execute(input);
  return NextResponse.json(files);
});

// POST /api/prescriptions — upload a prescription image
export const POST = WithContext(async ({ user, dependentId, req }) => {
  const formData = await req.formData().catch(() => null);
  if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");

  const file = formData.get("file");
  if (!(file instanceof File))
    throw ApiError.badRequest("'file' field is required.");

  // Optional session — if uploading from within a chat, pass the sessionId;
  // otherwise falls back to the (profile-scoped) prescriptions virtual session.
  const sessionId =
    (formData.get("sessionId") as string | null) ??
    getPrescriptionSessionId(dependentId);

  // Accept only image types for prescriptions
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    throw ApiError.badRequest(
      "Prescriptions must be an image (JPEG, PNG, WEBP, HEIC) or PDF.",
    );
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw ApiError.badRequest(`Unsupported file type '${file.type}'.`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const input = UploadFileUseCase.validate({
    userId: user.uid,
    sessionId,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    buffer,
  });

  const uploaded = await new UploadFileUseCase().execute(input);
  return NextResponse.json(uploaded, { status: 201 });
});
