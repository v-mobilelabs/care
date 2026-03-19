/**
 * Nutrition Models — USDA FoodData Central integration
 *
 * Professional nutrition data models for clinical-grade diet planning.
 * Based on USDA FoodData Central API structure for precise macro/micronutrients.
 */

import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";
import type { DietaryType } from "@/lib/constants";

// ── USDA Food Data ────────────────────────────────────────────────────────────

export interface USDANutrient {
  /** Nutrient name (e.g., "Protein", "Vitamin C") */
  name: string;
  /** Amount in specified unit */
  amount: number;
  /** Unit (e.g., "g", "mg", "µg") */
  unit: string;
  /** Daily Value percentage (if applicable) */
  dailyValue?: number;
}

export interface USDAFoodDocument {
  /** FDC ID from USDA database */
  fdcId: string;
  /** Food description */
  description: string;
  /** Food category (e.g., "Vegetables", "Dairy") */
  category: string;
  /** Brand name (if applicable) */
  brand?: string;
  /** Serving size in grams */
  servingSize: number;
  /** Calories per serving */
  calories: number;
  /** Macro nutrients */
  macros: {
    protein: number; // grams
    carbs: number; // grams
    fat: number; // grams
    fiber: number; // grams
  };
  /** Detailed nutrients list */
  nutrients: USDANutrient[];
  /** Common allergens */
  allergens: string[];
  /** Dietary type */
  dietaryType: DietaryType;
  /** Regional availability */
  regions: string[];
  /** Vector embedding for semantic search (768 dims) */
  embedding: number[]; // Firebase VectorValue
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Regional Cuisine Protocols ────────────────────────────────────────────────

export interface RegionalCuisineDocument {
  /** Unique identifier (e.g., "south-asian-diabetic") */
  id: string;
  /** Display name */
  name: string;
  /** Region (e.g., "South Asian", "Mediterranean") */
  region: string;
  /** Cuisine type (e.g., "Indian", "Italian") */
  cuisine: string;
  /** Target condition (e.g., "diabetes", "weight-loss") */
  condition?: string;
  /** Typical ingredients for this cuisine */
  typicalIngredients: string[];
  /** Cooking methods */
  cookingMethods: string[];
  /** Staple foods */
  staples: {
    grains: string[];
    proteins: string[];
    vegetables: string[];
    spices: string[];
  };
  /** Sample meal patterns */
  mealPatterns: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks: string[];
  };
  /** Cultural considerations */
  culturalNotes: string;
  /** Vector embedding for semantic search (768 dims) */
  embedding: number[]; // Firebase VectorValue
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Clinical Nutrition Guardrails ─────────────────────────────────────────────

export interface NutritionGuardrail {
  /** Rule identifier */
  id: string;
  /** Display name */
  name: string;
  /** Target condition or population */
  target: string;
  /** Clinical standard (e.g., "ADA 2026", "NICE") */
  standard: string;
  /** Rule type */
  type: "minimum" | "maximum" | "range" | "ratio";
  /** Nutrient or metric */
  metric: string;
  /** Threshold values */
  threshold: {
    min?: number;
    max?: number;
    unit: string;
  };
  /** Formula for calculation (if complex) */
  formula?: string;
  /** Clinical rationale */
  rationale: string;
  /** Applied to */
  appliesTo: "daily" | "meal" | "weekly";
}

export const ClinicalGuardrails: NutritionGuardrail[] = [
  {
    id: "ada-2026-protein-older-adults",
    name: "Protein for Older Adults",
    target: "Adults 65+",
    standard: "ADA 2026",
    type: "minimum",
    metric: "protein",
    threshold: { min: 0.8, unit: "g/kg/day" },
    rationale:
      "Adequate protein intake preserves muscle mass and prevents sarcopenia in older adults",
    appliesTo: "daily",
  },
  {
    id: "ada-2026-carb-diabetes",
    name: "Carbohydrate Control for Diabetes",
    target: "Type 2 Diabetes",
    standard: "ADA 2026",
    type: "range",
    metric: "carbs",
    threshold: { min: 45, max: 60, unit: "% of total calories" },
    rationale:
      "Moderate carb intake improves glycemic control while maintaining energy",
    appliesTo: "daily",
  },
  {
    id: "nice-2026-weight-loss",
    name: "Caloric Deficit for Weight Loss",
    target: "Weight Management",
    standard: "NICE 2026",
    type: "range",
    metric: "caloric_deficit",
    threshold: { min: 5, max: 7, unit: "% below TDEE" },
    rationale:
      "Modest deficit achieves sustainable weight loss of 0.5-1 kg/week",
    appliesTo: "daily",
  },
  {
    id: "ada-2026-fiber",
    name: "Dietary Fiber",
    target: "Metabolic Health",
    standard: "ADA 2026",
    type: "minimum",
    metric: "fiber",
    threshold: { min: 25, unit: "g/day" },
    rationale: "Adequate fiber improves glycemic control and gut health",
    appliesTo: "daily",
  },
  {
    id: "aha-2026-sodium",
    name: "Sodium Restriction",
    target: "Hypertension",
    standard: "AHA 2026",
    type: "maximum",
    metric: "sodium",
    threshold: { max: 2300, unit: "mg/day" },
    rationale: "Sodium restriction reduces blood pressure",
    appliesTo: "daily",
  },
  {
    id: "aha-2026-saturated-fat",
    name: "Saturated Fat Limit",
    target: "Cardiovascular Health",
    standard: "AHA 2026",
    type: "maximum",
    metric: "saturated_fat",
    threshold: { max: 6, unit: "% of total calories" },
    rationale: "Reduces LDL cholesterol and cardiovascular risk",
    appliesTo: "daily",
  },
];

// ── Enhanced Meal Schemas ─────────────────────────────────────────────────────

export const NutrientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  dailyValue: z.number().optional(),
});

export const EnhancedFoodSchema = z.object({
  item: z.string().min(1),
  fdcId: z.string().optional(), // USDA FDC ID if available
  portion: z.string(),
  weight_grams: z.number().min(1),
  calories: z.number().nonnegative(),
  macros: z.object({
    protein_g: z.number().nonnegative(),
    carbs_g: z.number().nonnegative(),
    fats_g: z.number().nonnegative(),
    fiber_g: z.number().nonnegative(),
  }),
  micronutrients: z.array(NutrientSchema).optional(),
  ingredients: z.array(z.string()).default([]),
  instructions: z.string().optional(),
  allergens: z.array(z.string()).default([]),
  dietaryType: z.enum(["veg", "non-veg", "vegan"]),
  /** Regional alternatives */
  substitutions: z
    .array(
      z.object({
        item: z.string(),
        region: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
});

export const EnhancedMealSchema = z.object({
  name: z.string().min(1),
  time: z.string(),
  foods: z.array(EnhancedFoodSchema),
  totalCalories: z.number().nonnegative(),
  totalMacros: z.object({
    protein_g: z.number().nonnegative(),
    carbs_g: z.number().nonnegative(),
    fats_g: z.number().nonnegative(),
    fiber_g: z.number().nonnegative(),
  }),
});

export const EnhancedDietDaySchema = z.object({
  day: z.string().min(1),
  day_number: z.number().int().min(1).max(7),
  meals: z.object({
    breakfast: EnhancedMealSchema,
    lunch: EnhancedMealSchema,
    snack: EnhancedMealSchema,
    dinner: EnhancedMealSchema,
  }),
  dailyTotals: z.object({
    calories: z.number().nonnegative(),
    protein_g: z.number().nonnegative(),
    carbs_g: z.number().nonnegative(),
    fats_g: z.number().nonnegative(),
    fiber_g: z.number().nonnegative(),
  }),
  /** Compliance with clinical guardrails */
  guardrailCompliance: z
    .array(
      z.object({
        guardrailId: z.string(),
        status: z.enum(["pass", "warn", "fail"]),
        value: z.number(),
        message: z.string(),
      }),
    )
    .default([]),
});

export type EnhancedFood = z.infer<typeof EnhancedFoodSchema>;
export type EnhancedMeal = z.infer<typeof EnhancedMealSchema>;
export type EnhancedDietDay = z.infer<typeof EnhancedDietDaySchema>;

// ── Professional Diet Plan ────────────────────────────────────────────────────

export interface ProfessionalDietPlanDocument {
  userId: string;
  sessionId?: string;
  /** Patient profile data */
  patientProfile: {
    age: number;
    weight_kg: number;
    height_cm: number;
    gender: "male" | "female" | "other";
    activityLevel:
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active";
    goal: "weight-loss" | "weight-gain" | "maintenance" | "muscle-gain";
    conditions: string[]; // ICD-10 codes
    allergies: string[];
    region: string;
    cuisine: string;
  };
  /** Calculated metabolic data */
  metabolicData: {
    bmr: number; // Basal Metabolic Rate
    tdee: number; // Total Daily Energy Expenditure
    targetCalories: number; // Based on goal
    macroTargets: {
      protein_g: number;
      carbs_g: number;
      fats_g: number;
      fiber_g: number;
    };
  };
  /** 7-day meal plan */
  weeklyPlan: EnhancedDietDay[];
  /** Aggregated grocery list */
  groceryList: {
    category: string;
    items: { name: string; quantity: string; alternatives: string[] }[];
  }[];
  /** Clinical guidelines applied */
  appliedGuardrails: string[];
  /** Regional cuisine protocol used */
  cuisineProtocol: string;
  /** Professional disclaimers */
  disclaimers: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Grocery List Types ────────────────────────────────────────────────────────

export interface GroceryItem {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  alternatives: string[];
  isStaple: boolean;
}

export interface GroceryList {
  weekOf: string;
  totalItems: number;
  categories: {
    category: string;
    items: GroceryItem[];
  }[];
  estimatedCost?: {
    min: number;
    max: number;
    currency: string;
  };
}
