/**
 * POST /api/diet-plans/generate-professional
 *
 * Generate a 7-day professional diet plan using RAG-based nutritional data
 * and clinical guardrails (ADA 2026, NICE).
 */

import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GenerateProfessionalDietPlanUseCase } from "@/data/diet-plans";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for AI generation

export const POST = WithContext(async (ctx) => {
  const body = (await ctx.req.json()) as unknown;

  const useCase = new GenerateProfessionalDietPlanUseCase(ctx.dependentId);
  const dietPlan = await useCase.execute({
    ...(body as object),
    userId: ctx.user.uid,
  });

  return NextResponse.json(dietPlan, { status: 201 });
});
