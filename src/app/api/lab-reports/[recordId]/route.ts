import { NextResponse, after } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { DeleteFileUseCase } from "@/data/files";
import {
  GetLabReportUseCase,
  DeleteLabReportUseCase,
  ExtractLabReportUseCase,
  labReportRepository,
} from "@/data/lab-reports";

// ── GET /api/lab-reports/[recordId] — fetch a single lab report record ─────────

export const GET = WithContext<{ recordId: string }>(
  async ({ user }, { recordId }) => {
    const record = await new GetLabReportUseCase().execute({
      userId: user.uid,
      labReportId: recordId,
    });
    if (!record) throw ApiError.notFound("Lab report record not found.");
    return NextResponse.json(record);
  },
);

// ── DELETE /api/lab-reports/[recordId] — delete record + underlying file ───────

export const DELETE = WithContext<{ recordId: string }>(
  async ({ user, profileId }, { recordId }) => {
    const record = await new GetLabReportUseCase().execute({
      userId: user.uid,
      labReportId: recordId,
    });
    if (!record) throw ApiError.notFound("Lab report record not found.");

    await new DeleteLabReportUseCase().execute({
      userId: user.uid,
      labReportId: recordId,
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
          `[lab-reports] Could not delete file ${record.fileId} — may already be gone.`,
        );
      }
    });

    return NextResponse.json({ ok: true });
  },
);

export const PATCH = WithContext<{ recordId: string }>(
  async ({ user, profileId, req }, { recordId }) => {
    const record = await new GetLabReportUseCase().execute({
      userId: user.uid,
      labReportId: recordId,
    });
    if (!record) throw ApiError.notFound("Lab report record not found.");

    const body = (await req.json().catch(() => ({}))) as { sessionId?: string };

    // If the request body contains a sessionId, link the session to this report
    if (body.sessionId && typeof body.sessionId === "string") {
      const updated = await labReportRepository.patchSessionId(
        user.uid,
        recordId,
        body.sessionId,
      );
      return NextResponse.json(updated);
    }

    // Otherwise, re-extract the report with AI
    const updated = await new ExtractLabReportUseCase().execute({
      userId: user.uid,
      profileId,
      fileId: record.fileId,
    });
    return NextResponse.json(updated);
  },
);
