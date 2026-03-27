import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateSessionUseCase,
  ListSessionsUseCase,
  ListSessionsPaginatedUseCase,
} from "@/data/sessions";
import { CacheTags } from "@/data/cached";

// GET /api/sessions — list sessions for the authenticated user
// Supports cursor-based pagination via ?cursor=&limit= query params.
// When cursor or limit are provided, returns PaginatedSessions; otherwise SessionDto[].
export const GET = WithContext(async ({ user, profileId, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const agent = url.searchParams.get("agent") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;

  // If pagination params are present, use paginated endpoint
  if (cursor || limit || agent || q || sortDir) {
    const result = await new ListSessionsPaginatedUseCase().execute({
      userId: user.uid,
      profileId,
      ...(cursor && { cursor }),
      ...(limit && { limit }),
      ...(agent && { agent }),
      ...(q && { q }),
      ...(sortDir && { sortDir }),
    });
    return NextResponse.json(result);
  }

  // Default: return flat array for existing consumers
  const sessions = await new ListSessionsUseCase().execute({
    userId: user.uid,
    profileId,
  });
  return NextResponse.json(sessions);
});

// POST /api/sessions — create a new session
export const POST = WithContext(async ({ user, profileId, req }) => {
  const body = await req.json().catch(() => ({}));
  const session = await new CreateSessionUseCase().execute({
    userId: user.uid,
    profileId,
    ...body,
  });
  revalidateTag(CacheTags.sessions(user.uid), "seconds");
  return NextResponse.json(session, { status: 201 });
});
