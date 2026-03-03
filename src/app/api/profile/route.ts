import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { profileRepository } from "@/data/profile";
import { UpsertProfileSchema } from "@/data/profile";

// GET /api/profile — get the authenticated user's health profile
export const GET = WithContext(async ({ user }) => {
  const profile = await profileRepository.get(user.uid);
  return NextResponse.json(profile ?? { userId: user.uid });
});

// PUT /api/profile — upsert the authenticated user's health profile
export const PUT = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = UpsertProfileSchema.parse({
    ...(body as object),
    userId: user.uid,
  });
  const profile = await profileRepository.upsert(input);
  return NextResponse.json(profile);
});
