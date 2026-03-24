import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteDietPlanUseCase } from "@/data/diet-plans";

// DELETE /api/diet-plans/[planId]
export const DELETE = WithContext<{ planId: string }>(
  async ({ user }, { planId }) => {
    await new DeleteDietPlanUseCase().execute({
      userId: user.uid,
      planId,
    });
    return NextResponse.json({ ok: true });
  },
);
