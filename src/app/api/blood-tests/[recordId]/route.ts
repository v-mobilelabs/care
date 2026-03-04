import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { DeleteFileUseCase } from "@/data/sessions";
import {
  GetBloodTestUseCase,
  DeleteBloodTestUseCase,
  ExtractBloodTestUseCase,
} from "@/data/blood-tests";
import { BLOOD_TESTS_SESSION_ID } from "../route";

// ── GET /api/blood-tests/[recordId] — fetch a single blood test record ─────────

export const GET = WithContext<{ recordId: string }>(
  async ({ user, dependentId }, { recordId }) => {
    const input = GetBloodTestUseCase.validate({
      userId: user.uid,
      bloodTestId: recordId,
    });
    const record = await new GetBloodTestUseCase(dependentId).execute(input);
    if (!record) throw ApiError.notFound("Blood test record not found.");
    return NextResponse.json(record);
  },
);

// ── DELETE /api/blood-tests/[recordId] — delete record + underlying file ───────

export const DELETE = WithContext<{ recordId: string }>(
  async ({ user, dependentId, profileId }, { recordId }) => {
    // Fetch the record first to get the fileId and sessionId
    const getInput = GetBloodTestUseCase.validate({
      userId: user.uid,
      bloodTestId: recordId,
    });
    const record = await new GetBloodTestUseCase(dependentId).execute(getInput);
    if (!record) throw ApiError.notFound("Blood test record not found.");

    // Delete the Firestore blood test document
    const deleteInput = DeleteBloodTestUseCase.validate({
      userId: user.uid,
      bloodTestId: recordId,
    });
    await new DeleteBloodTestUseCase(dependentId).execute(deleteInput);

    // Delete the underlying file from Cloud Storage + Firestore
    try {
      const fileInput = DeleteFileUseCase.validate({
        userId: user.uid,
        profileId,
        sessionId: record.sessionId,
        fileId: record.fileId,
      });
      await new DeleteFileUseCase().execute(fileInput);
    } catch {
      // Non-fatal — log but don't block the response
      console.warn(
        `[blood-tests] Could not delete file ${record.fileId} — may already be gone.`,
      );
    }

    return NextResponse.json({ ok: true });
  },
);

// ── POST /api/blood-tests/[recordId]/re-extract — re-run AI extraction ─────────
// Accessible via /api/blood-tests/[recordId] with method PATCH conceptually,
// but we expose it as a nested route in the extract sub-route file.
// This endpoint is a convenience alias: triggers re-extract for the given record.

export const PATCH = WithContext<{ recordId: string }>(
  async ({ user, dependentId, profileId }, { recordId }) => {
    const getInput = GetBloodTestUseCase.validate({
      userId: user.uid,
      bloodTestId: recordId,
    });
    const record = await new GetBloodTestUseCase(dependentId).execute(getInput);
    if (!record) throw ApiError.notFound("Blood test record not found.");

    try {
      const extractInput = ExtractBloodTestUseCase.validate({
        userId: user.uid,
        profileId,
        dependentId,
        fileId: record.fileId,
        sessionId: record.sessionId ?? BLOOD_TESTS_SESSION_ID,
      });
      const updated = await new ExtractBloodTestUseCase().execute(extractInput);
      return NextResponse.json(updated);
    } catch (error_) {
      if (error_ instanceof ApiError) throw error_;
      const code = (error_ as { code?: string }).code;
      if (code === "CREDITS_EXHAUSTED") {
        return NextResponse.json(
          {
            error: {
              code: "CREDITS_EXHAUSTED",
              message: "Daily credits exhausted.",
            },
          },
          { status: 402 },
        );
      }
      const msg = error_ instanceof Error ? error_.message : String(error_);
      console.error("[blood-tests] Re-extraction failed:", msg);
      throw ApiError.internal(`AI re-extraction failed: ${msg}`);
    }
  },
);
