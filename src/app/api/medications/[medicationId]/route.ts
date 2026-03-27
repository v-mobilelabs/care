import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  UpdateMedicationUseCase,
  DeleteMedicationUseCase,
} from "@/data/medications";
import { CacheTags } from "@/data/cached";

// PATCH /api/medications/[medicationId] — update a medication
export const PATCH = WithContext<{ medicationId: string }>(
  async ({ user, req }, { medicationId }) => {
    const body = (await req.json()) as unknown;
    const medication = await new UpdateMedicationUseCase().execute({
      ...(body as object),
      userId: user.uid,
      medicationId,
    });
    revalidateTag(CacheTags.medications(user.uid), "minutes");
    revalidateTag(CacheTags.medicationMatchUser(user.uid), "minutes");
    return NextResponse.json(medication);
  },
);

// DELETE /api/medications/[medicationId]
export const DELETE = WithContext<{ medicationId: string }>(
  async ({ user }, { medicationId }) => {
    await new DeleteMedicationUseCase().execute({
      userId: user.uid,
      medicationId,
    });
    revalidateTag(CacheTags.medications(user.uid), "minutes");
    revalidateTag(CacheTags.medicationMatchUser(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
