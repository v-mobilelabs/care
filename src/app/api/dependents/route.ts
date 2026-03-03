import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { dependentRepository } from "@/data/dependents";
import { CreateDependentSchema } from "@/data/dependents";

// GET /api/dependents — list all dependents for the authenticated user
export const GET = WithContext(async ({ user }) => {
  const dependents = await dependentRepository.list(user.uid);
  return NextResponse.json(dependents);
});

// POST /api/dependents — create a new dependent profile
export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = CreateDependentSchema.parse({
    ...(body as object),
    ownerId: user.uid,
  });
  const dependent = await dependentRepository.create(input);
  return NextResponse.json(dependent, { status: 201 });
});
