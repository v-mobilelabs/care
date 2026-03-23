import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { DeleteConditionUseCase } from "@/data/conditions";
import { CacheTags } from "@/data/cached";

// DELETE /api/conditions/[conditionId]
export const DELETE = WithContext<{ conditionId: string }>(
  async ({ user, dependentId }, { conditionId }) => {
    await new DeleteConditionUseCase(dependentId).execute({
      userId: user.uid,
      conditionId,
    });
    revalidateTag(CacheTags.conditions(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
