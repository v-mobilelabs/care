import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetVitalUseCase, DeleteVitalUseCase } from "@/data/vitals";

// GET /api/vitals/[vitalId] — get a single vital reading
export const GET = WithContext<{ vitalId: string }>(
  async ({ user, dependentId }, { vitalId }) => {
    const input = GetVitalUseCase.validate({ userId: user.uid, vitalId });
    const vital = await new GetVitalUseCase(dependentId).execute(input);
    if (!vital)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vital);
  },
);

// DELETE /api/vitals/[vitalId] — delete a vital reading
export const DELETE = WithContext<{ vitalId: string }>(
  async ({ user, dependentId }, { vitalId }) => {
    const input = DeleteVitalUseCase.validate({ userId: user.uid, vitalId });
    await new DeleteVitalUseCase(dependentId).execute(input);
    return new NextResponse(null, { status: 204 });
  },
);
