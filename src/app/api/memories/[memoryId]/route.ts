import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { DeleteMemoryUseCase } from "@/data/memory";
import { CacheTags } from "@/data/cached";

// DELETE /api/memories/[memoryId]
export const DELETE = WithContext<{ memoryId: string }>(
  async ({ user, profileId }, { memoryId }) => {
    await new DeleteMemoryUseCase().execute({
      userId: user.uid,
      profileId,
      memoryId,
    });
    revalidateTag(CacheTags.memories(profileId), "minutes");
    return NextResponse.json({ ok: true });
  },
);
