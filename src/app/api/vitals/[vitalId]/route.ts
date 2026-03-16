import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetVitalUseCase, DeleteVitalUseCase } from "@/data/vitals";

// GET /api/vitals/[vitalId] — get a single vital reading
export const GET = WithContext<{ vitalId: string }>(
  async ({ user, dependentId }, { vitalId }) => {
    const vital = await new GetVitalUseCase(dependentId).execute({
      userId: user.uid,
      vitalId,
    });
    if (!vital)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    return new NextResponse(null, { status: 204 });
  },
);
