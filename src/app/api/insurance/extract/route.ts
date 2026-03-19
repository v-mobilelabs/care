import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { bucket } from "@/lib/firebase/admin";
import { ExtractInsuranceUseCase } from "@/data/insurance";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/insurance/extract
 *
 * Accepts a multipart/form-data request with a `file` field.
 * 1. Uploads the file to GCS at a "draft" path.
 * 2. Runs AI extraction to get pre-filled insurance details.
 * 3. Returns `{ storagePath, documentUrl, extracted }`.
 *
 * The client uses the extracted data to pre-fill the review form, then calls
 * POST /api/insurance (with `documentStoragePath` + `documentUrl`) to persist.
 */
export const POST = WithContext(async ({ user, req }) => {
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
  const draftId = randomUUID();
  const storagePath = `users/${user.uid}/insurance/drafts/${draftId}/${file.name}`;

  // 1. Upload to Cloud Storage

  const gcsFile = bucket.file(storagePath);
  await gcsFile.save(buffer, {
    contentType: file.type,
    metadata: { cacheControl: "private, max-age=31536000" },
  });

  // 2. Get a signed download URL
  const [documentUrl] = await gcsFile.getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_EXPIRY_MS,
  });

  // 3. AI extraction
  // CreditsExhaustedError propagates to WithContext → standard 402 response.
  try {
    const extracted = await new ExtractInsuranceUseCase().execute({
      userId: user.uid,
      storagePath,
      mimeType: file.type,
    });

    return NextResponse.json({ storagePath, documentUrl, extracted });
  } catch (err) {
    // Let CreditsExhaustedError propagate to WithContext.
    if ((err as { code?: string }).code === "CREDITS_EXHAUSTED") throw err;
    // Still return the uploaded file paths so the user can fill manually
    return NextResponse.json({
      storagePath,
      documentUrl,
      extracted: {},
      extractionError: err instanceof Error ? err.message : "Extraction failed",
    });
  }
});
