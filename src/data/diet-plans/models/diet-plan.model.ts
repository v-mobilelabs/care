import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Shared sub-types ─────────────────────────────────────────────────────────

export type DietaryType = "veg" | "non-veg" | "vegan";

export interface DietFoodNutrition {
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
}

export interface DietFood {
  item: string;
  portion: string;
  calories: number;
  weight?: number; // grams
  nutrition?: DietFoodNutrition;
  allergens?: string[];
  dietaryType?: DietaryType;
}

export interface DietMeal {
  name: string;
  time: string;
  foods: DietFood[];
  totalCalories: number;
}

export interface DietDay {
  day: string;
  meals: DietMeal[];
  totalCalories: number;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface DietPlanDocument {
  userId: string;
  /** The chat session where this plan was generated */
  sessionId?: string;
  condition: string;
  overview: string;
  weeklyWeightLossEstimate?: string;
  totalDailyCalories?: number;
  weeklyPlan?: DietDay[];
  recommended: { food: string; reason: string }[];
  avoid: { food: string; reason: string }[];
  tips: string[];
  createdAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface DietPlanDto {
  id: string;
  userId: string;
  sessionId?: string;
  condition: string;
  overview: string;
  weeklyWeightLossEstimate?: string;
  totalDailyCalories?: number;
  weeklyPlan?: DietDay[];
  recommended: { food: string; reason: string }[];
  avoid: { food: string; reason: string }[];
  tips: string[];
  createdAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toDietPlanDto(id: string, doc: DietPlanDocument): DietPlanDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    condition: doc.condition,
    overview: doc.overview,
    weeklyWeightLossEstimate: doc.weeklyWeightLossEstimate,
    totalDailyCalories: doc.totalDailyCalories,
    weeklyPlan: doc.weeklyPlan,
    recommended: doc.recommended,
    avoid: doc.avoid,
    tips: doc.tips,
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

const FoodItemSchema = z.object({
  food: z.string().min(1),
  reason: z.string().min(1),
});

const DietFoodSchema = z.object({
  item: z.string().min(1),
  portion: z.string(),
  calories: z.number().nonnegative(),
  weight: z.number().nonnegative().optional(),
  nutrition: z
    .object({
      protein: z.number().nonnegative(),
      carbs: z.number().nonnegative(),
      fat: z.number().nonnegative(),
      fiber: z.number().nonnegative(),
    })
    .optional(),
  allergens: z.array(z.string()).optional(),
  dietaryType: z.enum(["veg", "non-veg", "vegan"]).optional(),
});

const DietMealSchema = z.object({
  name: z.string().min(1),
  time: z.string(),
  foods: z.array(DietFoodSchema),
  totalCalories: z.number().nonnegative(),
});

const DietDaySchema = z.object({
  day: z.string().min(1),
  meals: z.array(DietMealSchema),
  totalCalories: z.number().nonnegative(),
});

export const CreateDietPlanSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().optional(),
  condition: z.string().min(1),
  overview: z.string().min(1),
  weeklyWeightLossEstimate: z.string().optional(),
  totalDailyCalories: z.number().nonnegative().optional(),
  weeklyPlan: z.array(DietDaySchema).optional(),
  recommended: z.array(FoodItemSchema),
  avoid: z.array(FoodItemSchema),
  tips: z.array(z.string()),
});

export type CreateDietPlanInput = z.infer<typeof CreateDietPlanSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListDietPlansSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListDietPlansInput = z.infer<typeof ListDietPlansSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteDietPlanSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  planId: z.string().min(1, { message: "planId is required" }),
});

export type DeleteDietPlanInput = z.infer<typeof DeleteDietPlanSchema>;
