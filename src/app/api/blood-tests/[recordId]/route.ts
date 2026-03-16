import { NextResponse, after } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { DeleteFileUseCase } from "@/data/sessions";
import {
  GetBloodTestUseCase,
  DeleteBloodTestUseCase,
  ExtractBloodTestUseCase,
} from "@/data/blood-tests";

// ── GET /api/blood-tests/[recordId] — fetch a single blood test record ─────────

export const GET = WithContext<{ recordId: string }>(
  async ({ user, dependentId }, { recordId }) => {
    const record = await new GetBloodTestUseCase(dependentId).execute({
      userId: user.uid,
      bloodTestId: recordId,
    });
    if (!record) throw ApiError.notFound("Blood test record not found.");
    return NextResponse.json(record);
  },
);

// ── DELETE /api/blood-tests/[recordId] — delete record + underlying file ───────

export const DELETE = WithContext<{ recordId: string }>(
  async ({ user, dependentId, profileId }, { recordId }) => {
    const record = await new GetBloodTestUseCase(dependentId).execute({
      userId: user.uid,
      bloodTestId: recordId,
    });
    if (!record) throw ApiError.notFound("Blood test record not found.");

    await new DeleteBloodTestUseCase(dependentId).execute({
      userId: user.uid,
      bloodTestId: recordId,
    });

    after(async () => {
      try {
        await new DeleteFileUseCase().execute({
          userId: user.uid,
          profileId,
          fileId: record.fileId,
        });
      } catch {
        console.warn(
          `[blood-tests] Could not delete file ${record.fileId} — may already be gone.`,
        );
      }
    });

    return NextResponse.json({ ok: true });
  },
);

export const PATCH = WithContext<{ recordId: string }>(
  async ({ user, dependentId, profileId }, { recordId }) => {
    const record = await new GetBloodTestUseCase(dependentId).execute({
      userId: user.uid,
      bloodTestId: recordId,
    });
    if (!record) throw ApiError.notFound("Blood test record not found.");

    try {
      const updated = await new ExtractBloodTestUseCase().execute({
        userId: user.uid,
        profileId,
        dependentId,
        fileId: record.fileId,
      });
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
