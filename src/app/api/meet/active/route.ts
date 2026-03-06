import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { meetRepository } from "@/data/meet/repositories/meet.repository";

// GET /api/meet/active — returns the doctor's current active call (if any)
export const GET = WithContext({ kind: "doctor" }, async ({ user }) => {
  const active = await meetRepository.getActiveForDoctor(user.uid);
  return NextResponse.json(active);
});
