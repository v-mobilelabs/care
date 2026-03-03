import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { ExtractPrescriptionUseCase } from "@/data/prescriptions";
import { getPrescriptionSessionId } from "../../route";

// Re-export types so existing client code that imports from this path keeps working
export type { ExtractedMedication, ExtractResult } from "@/data/prescriptions";

// ── POST /api/prescriptions/[fileId]/extract ───────────────────────────────────────

export const POST = WithContext<{ fileId: string }>(
  async ({ user, dependentId, req }, { fileId }) => {
    // Accept an optional sessionId from the request body — callers that upload
    // from within a chat session pass their sessionId so the direct Firestore
    // path resolves correctly without needing a collectionGroup index.
    const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
    const sessionId = body.sessionId ?? getPrescriptionSessionId(dependentId);

    try {
      const result = await new ExtractPrescriptionUseCase().execute(
        ExtractPrescriptionUseCase.validate({
          userId: user.uid,
          sessionId,
          fileId,
        }),
      );

      return NextResponse.json(result);
    } catch (error_) {
      if (error_ instanceof ApiError) throw error_;
      const code = (error_ as { code?: string }).code;
      if (code === "FILE_NOT_FOUND") {
        throw ApiError.notFound("Prescription not found.");
      }
      if (code === "CREDITS_EXHAUSTED") {
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
              message: `You've used all your credits for today. They reset at ${reset.toUTCString().replace(/ GMT$/, " UTC")}.`,
            },
          },
          { status: 402 },
        );
      }
      const msg = error_ instanceof Error ? error_.message : String(error_);
      console.error("[extract] Unhandled error:", msg);
      throw ApiError.internal(`AI extraction failed: ${msg}`);
    }
  },
);
