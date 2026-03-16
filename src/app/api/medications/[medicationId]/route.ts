import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  UpdateMedicationUseCase,
  DeleteMedicationUseCase,
} from "@/data/medications";

// PATCH /api/medications/[medicationId] — update a medication
export const PATCH = WithContext<{ medicationId: string }>(
  async ({ user, req, dependentId }, { medicationId }) => {
    const body = (await req.json()) as unknown;
    const medication = await new UpdateMedicationUseCase(dependentId).execute({
      ...(body as object),
      userId: user.uid,
      medicationId,
    });
    return NextResponse.json(medication);
  },
);

// DELETE /api/medications/[medicationId]
export const DELETE = WithContext<{ medicationId: string }>(
  async ({ user, dependentId }, { medicationId }) => {
    await new DeleteMedicationUseCase(dependentId).execute({
      userId: user.uid,
      medicationId,
    });
    return NextResponse.json({ ok: true });
  },
);
