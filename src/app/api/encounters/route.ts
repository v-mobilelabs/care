import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListEncountersUseCase } from "@/data/encounters";

// GET /api/encounters?limit=50 — list encounters for the authenticated user
export const GET = WithContext(async ({ user, req }) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

  const encounters = await new ListEncountersUseCase().execute({
    userId: user.uid,
    kind: user.kind as "patient" | "doctor",
    limit,
  });

  return NextResponse.json(encounters);
});
