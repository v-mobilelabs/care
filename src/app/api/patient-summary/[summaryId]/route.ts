import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeletePatientSummaryUseCase } from "@/data/patient-summary";

// DELETE /api/patient-summary/:summaryId
export const DELETE = WithContext<{ summaryId: string }>(
  async ({ user, dependentId }, { summaryId }) => {
    await new DeletePatientSummaryUseCase(dependentId).execute({
      userId: user.uid,
      summaryId,
    });
    return NextResponse.json({ ok: true });
  },
);
