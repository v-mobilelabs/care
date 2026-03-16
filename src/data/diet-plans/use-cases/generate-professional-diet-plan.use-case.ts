/**
 * Generate Professional Diet Plan Use Case
 *
 * Creates a 7-day clinical-grade diet plan using the professional
 * diet planner agent with RAG-based nutritional data.
 */

import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { dietPlanRepository } from "../repositories/diet-plan.repository";
import type { DietPlanDto, DietPlanDocument } from "../models/diet-plan.model";

// TODO: Refactor — the old professionalDietPlannerAgent was deleted.
// This use case needs to be replaced with DietPlannerChatAgent or a
// dedicated non-chat generation flow.
type PatientProfile = {
  userId: string;
  sessionId?: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  gender: "male" | "female" | "other";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "weight-loss" | "weight-gain" | "maintenance" | "muscle-gain";
  conditions: string[];
  allergies: string[];
  region: string;
  cuisine: string;
};

// ── Input Schema ──────────────────────────────────────────────────────────────

export const GenerateProfessionalDietPlanSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().optional(),
  age: z.number().int().min(1).max(120),
  weight_kg: z.number().positive(),
  height_cm: z.number().positive(),
  gender: z.enum(["male", "female", "other"]),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goal: z.enum(["weight-loss", "weight-gain", "maintenance", "muscle-gain"]),
  conditions: z.array(z.string()).default([]), // ICD-10 codes
  allergies: z.array(z.string()).default([]),
  region: z.string().min(1),
  cuisine: z.string().min(1),
});

export type GenerateProfessionalDietPlanInput = z.infer<
  typeof GenerateProfessionalDietPlanSchema
>;

// ── Use Case ──────────────────────────────────────────────────────────────────

export class GenerateProfessionalDietPlanUseCase extends UseCase<
  GenerateProfessionalDietPlanInput,
  DietPlanDto
> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): GenerateProfessionalDietPlanInput {
    return GenerateProfessionalDietPlanSchema.parse(input);
  }

  protected async run(
    input: GenerateProfessionalDietPlanInput,
  ): Promise<DietPlanDto> {
    console.log(
      `[GenerateProfessionalDietPlan] Starting for user ${input.userId}`,
    );

    // Build patient profile
    const profile: PatientProfile = {
      userId: input.userId,
      sessionId: input.sessionId,
      age: input.age,
      weight_kg: input.weight_kg,
      height_cm: input.height_cm,
      gender: input.gender,
      activityLevel: input.activityLevel,
      goal: input.goal,
      conditions: input.conditions,
      allergies: input.allergies,
      region: input.region,
      cuisine: input.cuisine,
    };

    // TODO: Replace with refactored implementation.
    // The old professionalDietPlannerAgent has been removed — this use case
    // needs to be rewritten using the new DietPlannerChatAgent or a dedicated
    // non-chat generation flow before the /api/diet-plans/generate-professional
    // endpoint can be used again.
    void profile; // suppress unused variable warning
    throw new Error(
      "[GenerateProfessionalDietPlanUseCase] Not implemented — pending refactor.",
    );
  }
}
