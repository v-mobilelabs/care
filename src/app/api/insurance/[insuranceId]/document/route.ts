import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { UploadInsuranceDocumentUseCase } from "@/data/insurance";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /api/insurance/[insuranceId]/document — upload insurance card / document
export const POST = WithContext<{ insuranceId: string }>(
  async ({ user, req, dependentId }, { insuranceId }) => {
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
    const record = await new UploadInsuranceDocumentUseCase(
      dependentId,
    ).execute({
      userId: user.uid,
      insuranceId,
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json(record);
  },
);
