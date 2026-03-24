import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateConditionUseCase,
  ListConditionsUseCase,
} from "@/data/conditions";
import { CacheTags } from "@/data/cached";

// GET /api/conditions — list all conditions for the authenticated user
export const GET = WithContext(async ({ user }) => {
  const conditions = await new ListConditionsUseCase().execute({
    userId: user.uid,
  });
  return NextResponse.json(conditions);
});

// POST /api/conditions — save a detected condition to health records
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const condition = await new CreateConditionUseCase().execute({
    ...(body as object),
    userId: user.uid,
  });
  revalidateTag(CacheTags.conditions(user.uid), "minutes");
  return NextResponse.json(condition, { status: 201 });
});
