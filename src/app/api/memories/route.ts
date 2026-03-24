import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListMemoriesUseCase } from "@/data/memory";

// GET /api/memories — paginated list with search/filter/sort
export const GET = WithContext(async ({ user, profileId, req }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const category =
    (url.searchParams.get("category") as
      | "medical"
      | "preference"
      | "lifestyle"
      | "allergy"
      | "summary"
      | null) ?? undefined;
  const sortBy =
    (url.searchParams.get("sortBy") as
      | "lastAccessedAt"
      | "createdAt"
      | "category"
      | null) ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const result = await new ListMemoriesUseCase().execute({
    userId: user.uid,
    profileId,
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortDir ? { sortDir } : {}),
    ...(cursor ? { cursor } : {}),
    ...(limit ? { limit } : {}),
  });

  return NextResponse.json(result);
});
