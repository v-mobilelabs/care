import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetVitalUseCase, DeleteVitalUseCase } from "@/data/vitals";

// GET /api/vitals/[vitalId] — get a single vital reading
export const GET = WithContext<{ vitalId: string }>(
  async ({ user, dependentId }, { vitalId }) => {
    const vital = await new GetVitalUseCase(dependentId).execute({
      userId: user.uid,
      vitalId,
    });
    if (!vital) throw ApiError.notFound("Vital not found.");
    return NextResponse.json(vital);
  },
);

// DELETE /api/vitals/[vitalId] — delete a vital reading
export const DELETE = WithContext<{ vitalId: string }>(
  async ({ user, dependentId }, { vitalId }) => {
    await new DeleteVitalUseCase(dependentId).execute({
      userId: user.uid,
      vitalId,
    });
    return NextResponse.json({ ok: true });
  },
);
