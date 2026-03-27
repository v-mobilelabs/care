import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { DeleteSymptomObservationUseCase } from "@/data/symptom-observations";
import { CacheTags } from "@/data/cached";

// DELETE /api/symptom-observations/:observationId
export const DELETE = WithContext<{ observationId: string }>(
  async ({ user }, { observationId }) => {
    await new DeleteSymptomObservationUseCase().execute({
      userId: user.uid,
      observationId,
    });
    revalidateTag(CacheTags.symptomObservations(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
