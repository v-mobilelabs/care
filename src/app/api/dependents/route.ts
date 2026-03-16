import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  ListDependentsUseCase,
  CreateDependentUseCase,
} from "@/data/dependents";

// GET /api/dependents — list all dependents for the authenticated user
export const GET = WithContext(async ({ user }) => {
  const input = ListDependentsUseCase.validate({ ownerId: user.uid });
  const dependents = await new ListDependentsUseCase().execute(input);
  return NextResponse.json(dependents);
});

// POST /api/dependents — create a new dependent profile
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = CreateDependentUseCase.validate({
    ...(body as object),
    ownerId: user.uid,
  });
  const dependent = await new CreateDependentUseCase().execute(input);
  return NextResponse.json(dependent, { status: 201 });
});
