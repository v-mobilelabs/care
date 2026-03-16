import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteConditionUseCase } from "@/data/conditions";

// DELETE /api/conditions/[conditionId]
export const DELETE = WithContext<{ conditionId: string }>(
  async ({ user, dependentId }, { conditionId }) => {
    await new DeleteConditionUseCase(dependentId).execute({
      userId: user.uid,
      conditionId,
    });
    return NextResponse.json({ ok: true });
  },
);
