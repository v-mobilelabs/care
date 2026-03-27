import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListReferralsUseCase } from "@/data/referrals";

// GET /api/referrals — list all referrals for the authenticated user
export const GET = WithContext(async ({ user, req }) => {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const status =
    (url.searchParams.get("status") as
      | "pending"
      | "accepted"
      | "dismissed"
      | "completed"
      | null) ?? undefined;
  const specialist = url.searchParams.get("specialist") ?? undefined;
  const sortDir =
    (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const referrals = await new ListReferralsUseCase().execute({
    userId: user.uid,
    ...(cursor ? { cursor } : {}),
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(specialist ? { specialist } : {}),
    ...(sortDir ? { sortDir } : {}),
    ...(limit ? { limit } : {}),
  });

  return NextResponse.json(referrals);
});
