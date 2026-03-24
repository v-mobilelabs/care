import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { DeletePatientSummaryUseCase } from "@/data/patient-summary";
import { CacheTags } from "@/data/cached";

// DELETE /api/patient-summary/:summaryId
export const DELETE = WithContext<{ summaryId: string }>(
  async ({ user }, { summaryId }) => {
    await new DeletePatientSummaryUseCase().execute({
      userId: user.uid,
      summaryId,
    });
    revalidateTag(CacheTags.patientSummaries(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
