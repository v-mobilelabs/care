/**
 * POST /api/diet-plans/generate-professional
 *
 * Generate a 7-day professional diet plan using RAG-based nutritional data
 * and clinical guardrails (ADA 2026, NICE).
 */

import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  GenerateProfessionalDietPlanUseCase,
  GenerateProfessionalDietPlanSchema,
} from "@/data/diet-plans";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for AI generation

export const POST = WithContext(async (ctx) => {
  const body = await ctx.req.json();
  const input = GenerateProfessionalDietPlanSchema.parse({
    ...body,
    userId: ctx.user.uid,
  });

  const useCase = new GenerateProfessionalDietPlanUseCase(ctx.dependentId);
  const dietPlan = await useCase.execute(input);

  return NextResponse.json(dietPlan, { status: 201 });
});
