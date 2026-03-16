import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { GetProfileUseCase, UpsertProfileUseCase } from "@/data/profile";
import { CacheTags } from "@/data/cached";

// GET /api/profile — get the authenticated user's profile
export const GET = WithContext(async ({ user }) => {
  const profile = await new GetProfileUseCase().execute({ userId: user.uid });
  return NextResponse.json(profile ?? { userId: user.uid });
});

// PUT /api/profile — upsert the authenticated user's profile
export const PUT = WithContext(async ({ user, req }) => {
  const body = await req.json();
  const profile = await new UpsertProfileUseCase().execute({
    ...body,
    userId: user.uid,
  });
  revalidateTag(CacheTags.profile(user.uid), "minutes");
  return NextResponse.json(profile);
});
