import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  CreateConditionUseCase,
  ListConditionsUseCase,
} from "@/data/conditions";

// GET /api/conditions — list all conditions for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const input = ListConditionsUseCase.validate({ userId: user.uid });
  const conditions = await new ListConditionsUseCase(dependentId).execute(
    input,
  );
  return NextResponse.json(conditions);
});

// POST /api/conditions — save a detected condition to health records
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const input = CreateConditionUseCase.validate({
    ...(body as object),
    userId: user.uid,
  });
  const condition = await new CreateConditionUseCase(dependentId).execute(
    input,
  );
  return NextResponse.json(condition, { status: 201 });
});
