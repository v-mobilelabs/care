import { after } from "next/server";
import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  UploadFileUseCase,
  ClassifyFileUseCase,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/data/sessions";
import {
  ListLabReportsUseCase,
  ExtractLabReportUseCase,
} from "@/data/lab-reports";

// ── Tag for grouping lab report files in the flat files collection ────────────

const LAB_REPORTS_SESSION_TAG = "lab-reports";

// ── GET /api/lab-reports — list all extracted lab report records ────────────────

export const GET = WithContext(async ({ user, dependentId }) => {
  const records = await new ListLabReportsUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(records);
});

// ── POST /api/lab-reports — upload a file and immediately extract ────────────

export const POST = WithContext(
  async ({ user, dependentId, profileId, req }) => {
    const formData = await req.formData().catch(() => null);
    if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");

    const file = formData.get("file");
    if (!(file instanceof File))
      throw ApiError.badRequest("'file' field is required.");

    // Allow images, PDFs, and common Office document types
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isDoc =
      file.type === "application/msword" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isImage && !isPdf && !isDoc) {
      throw ApiError.badRequest(
        "Lab report files must be an image (JPEG, PNG, WEBP), PDF, or Word document.",
      );
    }

    if (
      !isDoc &&
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

    const sessionId = LAB_REPORTS_SESSION_TAG;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Upload file to Cloud Storage / Firestore
    const uploaded = await new UploadFileUseCase().execute({
      userId: user.uid,
      profileId,
      sessionId,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    });

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
          console.error("[POST /api/lab-reports] classify error:", err);
        });
    });

    // 2. Immediately trigger AI extraction
    // CreditsExhaustedError propagates to WithContext → standard 402 response.
    const record = await new ExtractLabReportUseCase().execute({
      userId: user.uid,
      profileId,
      dependentId,
      fileId: uploaded.id,
    });
    return NextResponse.json(record, { status: 201 });
  },
);
