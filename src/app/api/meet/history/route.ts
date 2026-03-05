import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListCallHistoryUseCase } from "@/data/meet";

// GET /api/meet/history?limit=50 — returns call history for the authenticated user
export const GET = WithContext(async ({ user, req }) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

  const calls = await new ListCallHistoryUseCase().execute({
    userId: user.uid,
    kind: user.kind as "patient" | "doctor",
    limit,
  });

  return NextResponse.json(calls);
});
