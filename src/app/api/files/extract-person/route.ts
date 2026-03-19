import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  ExtractPersonUseCase,
  type ExtractedPersonResult,
} from "@/data/sessions";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/files/extract-person
 *
 * Accepts a multipart/form-data request with a `file` field.
 * Uses AI vision to detect whether the file contains personal details for a
 * named individual and returns their name/DOB if found.
 *
 * Does NOT consume a user credit — this is a background system check.
 */
export const POST = WithContext(async ({ req }) => {
  const formData = await req.formData().catch(() => null);
  if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");

  const file = formData.get("file");
  if (!(file instanceof File))
    throw ApiError.badRequest("'file' field is required.");

  // Skip non-visual file types silently
  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return NextResponse.json<ExtractedPersonResult>({ hasPersonData: false });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const result = await new ExtractPersonUseCase().execute({
    mimeType: file.type,
    base64,
  });

  return NextResponse.json<ExtractedPersonResult>(result);
});
