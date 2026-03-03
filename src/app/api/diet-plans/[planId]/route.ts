import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteDietPlanUseCase } from "@/data/diet-plans";

// DELETE /api/diet-plans/[planId]
export const DELETE = WithContext<{ planId: string }>(
  async ({ user, dependentId }, { planId }) => {
    const input = DeleteDietPlanUseCase.validate({
      userId: user.uid,
      planId,
    });
    await new DeleteDietPlanUseCase(dependentId).execute(input);
    return NextResponse.json({ ok: true });
  },
);
