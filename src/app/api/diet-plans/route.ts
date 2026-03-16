import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateDietPlanUseCase, ListDietPlansUseCase } from "@/data/diet-plans";

// GET /api/diet-plans — list all saved diet plans for the authenticated user
export const GET = WithContext(async ({ user, dependentId }) => {
  const plans = await new ListDietPlansUseCase(dependentId).execute({
    userId: user.uid,
  });
  return NextResponse.json(plans);
});

// POST /api/diet-plans — save a diet plan
export const POST = WithContext(async ({ user, req, dependentId }) => {
  const body = (await req.json()) as unknown;
  const plan = await new CreateDietPlanUseCase(dependentId).execute({
    ...(body as object),
    userId: user.uid,
  });
  return NextResponse.json(plan, { status: 201 });
});
