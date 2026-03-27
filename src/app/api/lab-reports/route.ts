import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  ListLabReportsUseCase,
} from "@/data/lab-reports";
import { runLabReportUploadAndExtractGraph } from "@/workflow/lab-report-api-flow.workflow";

// ── GET /api/lab-reports — list all extracted lab report records ────────────────

export const GET = WithContext(async ({ user }) => {
  const records = await new ListLabReportsUseCase().execute({
    userId: user.uid,
  });
  return NextResponse.json(records);
});

// ── POST /api/lab-reports — upload a file and immediately extract ────────────

export const POST = WithContext(async ({ user, profileId, req }) => {
  const record = await runLabReportUploadAndExtractGraph({
    userId: user.uid,
    profileId,
    req,
  });

  return NextResponse.json(record, { status: 201 });
});
