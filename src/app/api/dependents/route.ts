import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  ListDependentsUseCase,
  CreateDependentUseCase,
} from "@/data/dependents";

// GET /api/dependents — list all dependents for the authenticated user
export const GET = WithContext(async ({ user }) => {
  const dependents = await new ListDependentsUseCase().execute({
    ownerId: user.uid,
  });
  return NextResponse.json(dependents);
});

// POST /api/dependents — create a new dependent profile
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const dependent = await new CreateDependentUseCase().execute({
    ...(body as object),
    ownerId: user.uid,
  });
  return NextResponse.json(dependent, { status: 201 });
});
