import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteDietPlanUseCase } from "@/data/diet-plans";

// DELETE /api/diet-plans/[planId]
export const DELETE = WithContext<{ planId: string }>(
  async ({ user, dependentId }, { planId }) => {
    await new DeleteDietPlanUseCase(dependentId).execute({
      userId: user.uid,
      planId,
    });
    return NextResponse.json({ ok: true });
  },
);
