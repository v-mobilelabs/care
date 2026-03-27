import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  GetLabReportUseCase,
} from "@/data/lab-reports";
import {
  runLabReportDeleteGraph,
  runLabReportPatchGraph,
} from "@/workflow/lab-report-api-flow.workflow";

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
    return NextResponse.json(
      await runLabReportDeleteGraph({
        userId: user.uid,
        profileId,
        recordId,
      }),
    );
  },
);

export const PATCH = WithContext<{ recordId: string }>(
  async ({ user, profileId, req }, { recordId }) => {
    const updated = await runLabReportPatchGraph({
      userId: user.uid,
      profileId,
      recordId,
      req,
    });
    return NextResponse.json(updated);
  },
);
