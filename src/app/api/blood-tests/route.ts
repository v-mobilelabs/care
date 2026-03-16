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
  ListBloodTestsUseCase,
  ExtractBloodTestUseCase,
} from "@/data/blood-tests";

// ── Tag for grouping blood test files in the flat files collection ────────────

const BLOOD_TESTS_SESSION_TAG = "blood-tests";

// ── GET /api/blood-tests — list all extracted blood test records ──────────────

export const GET = WithContext(async ({ user, dependentId }) => {
  const records = await new ListBloodTestsUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(records);
});

// ── POST /api/blood-tests — upload a file and immediately extract ──────────

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
        "Blood test files must be an image (JPEG, PNG, WEBP), PDF, or Word document.",
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

    const sessionId = BLOOD_TESTS_SESSION_TAG;
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
          console.error("[POST /api/blood-tests] classify error:", err);
        });
    });

    // 2. Immediately trigger AI extraction
    try {
      const record = await new ExtractBloodTestUseCase().execute({
        userId: user.uid,
        profileId,
        dependentId,
        fileId: uploaded.id,
      });
      return NextResponse.json(record, { status: 201 });
    } catch (error_) {
      if (error_ instanceof ApiError) throw error_;

      const code = (error_ as { code?: string }).code;
      if (code === "CREDITS_EXHAUSTED") {
        // File was uploaded but extraction failed due to credits — return a meaningful error
        const reset = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() + 1,
          ),
        );
        return NextResponse.json(
          {
            error: {
              code: "CREDITS_EXHAUSTED",
              message: `File uploaded but extraction failed — credits exhausted. They reset at ${reset.toUTCString().replace(/ GMT$/, " UTC")}.`,
              fileId: uploaded.id,
            },
          },
          { status: 402 },
        );
      }

      const msg = error_ instanceof Error ? error_.message : String(error_);
      console.error("[blood-tests] Extraction failed after upload:", msg);
      throw ApiError.internal(`File uploaded but AI extraction failed: ${msg}`);
    }
  },
);
