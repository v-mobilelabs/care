import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { DeleteManyMemoriesUseCase } from "@/data/memory";
import { CacheTags } from "@/data/cached";

// POST /api/memories/delete-many — bulk delete selected memory IDs
export const POST = WithContext(async ({ user, profileId, req }) => {
  const body = (await req.json().catch(() => ({}))) as { memoryIds?: string[] };
  await new DeleteManyMemoriesUseCase().execute({
    userId: user.uid,
    profileId,
    memoryIds: body.memoryIds ?? [],
  });
  revalidateTag(CacheTags.memories(profileId), "minutes");
  return NextResponse.json({ ok: true });
});
