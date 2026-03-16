/**
 * Nutrition Service — RAG for USDA food data and regional cuisines
 *
 * Semantic search for nutritional data using vector embeddings.
 * Integrates USDA FoodData Central for precise nutritional information.
 */

import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/firebase/admin";
import type { DietaryType } from "@/lib/constants";
import { VectorQuery, VectorQuerySnapshot } from "@google-cloud/firestore";
import type {
  USDAFoodDocument,
  RegionalCuisineDocument,
  NutritionGuardrail,
} from "../models/nutrition.model";

// gemini-embedding-001 (768 dims) — matches Firestore vector index config
const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;

const FOOD_COLLECTION = "nutrition_foods";
const CUISINE_COLLECTION = "regional_cuisines";

export interface FoodSearchOptions {
  /** Max number of foods to return */
  topK?: number;
  /** Filter by region */
  region?: string;
  /** Filter by dietary type */
  dietaryType?: DietaryType;
  /** Filter by category */
  category?: string;
}

export interface CuisineSearchOptions {
  /** Max number of cuisine protocols to return */
  topK?: number;
  /** Target region */
  region?: string;
  /** Target condition */
  condition?: string;
}

export class NutritionService {
  /**
   * Search for foods based on semantic query
   * Returns top-k most relevant foods with complete nutritional data
   */
  async searchFoods(
    query: string,
    options: FoodSearchOptions = {},
  ): Promise<USDAFoodDocument[]> {
    const { topK = 10, region, dietaryType, category } = options;

    try {
      // 1. Embed the query
      const embedStart = performance.now();
      const { embedding: queryEmbedding } = await embed({
        model: embeddingModel,
        value: query,
        providerOptions: EMBEDDING_OPTS,
      });
      console.log(
        `[NutritionService] Embed food query: ${(performance.now() - embedStart).toFixed(0)}ms`,
      );

      // 2. Build vector query with filters
      const searchStart = performance.now();
      let baseQuery = db.collection(FOOD_COLLECTION);

      if (region) {
        baseQuery = baseQuery.where("regions", "array-contains", region) as any;
      }

      if (dietaryType) {
        baseQuery = baseQuery.where("dietaryType", "==", dietaryType) as any;
      }

      if (category) {
        baseQuery = baseQuery.where("category", "==", category) as any;
      }

      // 3. Execute vector search
      const vectorQuery: VectorQuery = (baseQuery as any).findNearest({
        vectorField: "embedding",
        queryVector: queryEmbedding,
        limit: topK,
        distanceMeasure: "COSINE",
      });

      const snapshot = (await vectorQuery.get()) as VectorQuerySnapshot;

      console.log(
        `[NutritionService] Food vector search: ${(performance.now() - searchStart).toFixed(0)}ms (${snapshot.docs.length} results)`,
      );

      // 4. Map results
      const foods: USDAFoodDocument[] = snapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as USDAFoodDocument[];

      return foods;
    } catch (error) {
      console.error("[NutritionService] Food search failed:", error);
      return [];
    }
  }

  /**
   * Search for regional cuisine protocols
   * Returns cuisine-specific meal patterns and ingredient recommendations
   */
  async searchCuisineProtocols(
    query: string,
    options: CuisineSearchOptions = {},
  ): Promise<RegionalCuisineDocument[]> {
    const { topK = 3, region, condition } = options;

    try {
      // 1. Embed the query
      const embedStart = performance.now();
      const { embedding: queryEmbedding } = await embed({
        model: embeddingModel,
        value: query,
        providerOptions: EMBEDDING_OPTS,
      });
      console.log(
        `[NutritionService] Embed cuisine query: ${(performance.now() - embedStart).toFixed(0)}ms`,
      );

      // 2. Build vector query with filters
      const searchStart = performance.now();
      let baseQuery = db.collection(CUISINE_COLLECTION);

      if (region) {
        baseQuery = baseQuery.where("region", "==", region) as any;
      }

      if (condition) {
        baseQuery = baseQuery.where("condition", "==", condition) as any;
      }

      // 3. Execute vector search
      const vectorQuery: VectorQuery = (baseQuery as any).findNearest({
        vectorField: "embedding",
        queryVector: queryEmbedding,
        limit: topK,
        distanceMeasure: "COSINE",
      });

      const snapshot = (await vectorQuery.get()) as VectorQuerySnapshot;

      console.log(
        `[NutritionService] Cuisine vector search: ${(performance.now() - searchStart).toFixed(0)}ms (${snapshot.docs.length} results)`,
      );

      // 4. Map results
      const cuisines: RegionalCuisineDocument[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as RegionalCuisineDocument[];

      return cuisines;
    } catch (error) {
      console.error("[NutritionService] Cuisine search failed:", error);
      return [];
    }
  }

  /**
   * Get applicable clinical guardrails for patient profile
   */
  getApplicableGuardrails(
    conditions: string[],
    age: number,
    goal: string,
  ): NutritionGuardrail[] {
    const { ClinicalGuardrails } = require("../models/nutrition.model");
    const applicable: NutritionGuardrail[] = [];

    // Always include general metabolic health guardrails
    applicable.push(
      ...ClinicalGuardrails.filter(
        (g: NutritionGuardrail) =>
          g.target === "Metabolic Health" ||
          g.target === "Cardiovascular Health",
      ),
    );

    // Age-specific
    if (age >= 65) {
      applicable.push(
        ...ClinicalGuardrails.filter(
          (g: NutritionGuardrail) => g.target === "Adults 65+",
        ),
      );
    }

    // Condition-specific
    if (conditions.includes("E11")) {
      // Type 2 Diabetes
      applicable.push(
        ...ClinicalGuardrails.filter(
          (g: NutritionGuardrail) => g.target === "Type 2 Diabetes",
        ),
      );
    }

    if (conditions.includes("I10")) {
      // Hypertension
      applicable.push(
        ...ClinicalGuardrails.filter(
          (g: NutritionGuardrail) => g.target === "Hypertension",
        ),
      );
    }

    // Goal-specific
    if (goal === "weight-loss") {
      applicable.push(
        ...ClinicalGuardrails.filter(
          (g: NutritionGuardrail) => g.target === "Weight Management",
        ),
      );
    }

    return applicable;
  }

  /**
   * Calculate BMR using Mifflin-St Jeor Equation
   * Most accurate for modern populations
   */
  calculateBMR(
    weight_kg: number,
    height_cm: number,
    age: number,
    gender: "male" | "female" | "other",
  ): number {
    let bmr: number;

    if (gender === "male") {
      bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
    } else {
      // female or other
      bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
    }

    return Math.round(bmr);
  }

  /**
   * Calculate TDEE based on activity level
   */
  calculateTDEE(
    bmr: number,
    activityLevel:
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active",
  ): number {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    return Math.round(bmr * multipliers[activityLevel]);
  }

  /**
   * Calculate target calories based on goal
   */
  calculateTargetCalories(
    tdee: number,
    goal: "weight-loss" | "weight-gain" | "maintenance" | "muscle-gain",
  ): number {
    switch (goal) {
      case "weight-loss":
        // 6% deficit (NICE 2026 guideline)
        return Math.round(tdee * 0.94);
      case "weight-gain":
        // 10% surplus
        return Math.round(tdee * 1.1);
      case "muscle-gain":
        // 15% surplus with high protein
        return Math.round(tdee * 1.15);
      case "maintenance":
      default:
        return tdee;
    }
  }

  /**
   * Calculate macro targets based on goal and clinical guidelines
   */
  calculateMacroTargets(
    targetCalories: number,
    goal: "weight-loss" | "weight-gain" | "maintenance" | "muscle-gain",
    hasConditions: boolean,
  ): {
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    fiber_g: number;
  } {
    let proteinPercent: number;
    let fatPercent: number;
    let carbPercent: number;

    switch (goal) {
      case "weight-loss":
        // High protein to preserve muscle
        proteinPercent = 0.3;
        fatPercent = 0.3;
        carbPercent = 0.4;
        break;
      case "muscle-gain":
        // Very high protein
        proteinPercent = 0.35;
        fatPercent = 0.25;
        carbPercent = 0.4;
        break;
      case "weight-gain":
        proteinPercent = 0.25;
        fatPercent = 0.3;
        carbPercent = 0.45;
        break;
      case "maintenance":
      default:
        if (hasConditions) {
          // Moderate carb for diabetes (ADA 2026)
          proteinPercent = 0.25;
          fatPercent = 0.3;
          carbPercent = 0.45;
        } else {
          proteinPercent = 0.2;
          fatPercent = 0.3;
          carbPercent = 0.5;
        }
    }

    return {
      protein_g: Math.round((targetCalories * proteinPercent) / 4),
      carbs_g: Math.round((targetCalories * carbPercent) / 4),
      fats_g: Math.round((targetCalories * fatPercent) / 9),
      fiber_g: 25, // ADA 2026 minimum
    };
  }

  /**
   * Format foods for prompt context
   */
  formatFoodsForPrompt(foods: USDAFoodDocument[]): string {
    if (foods.length === 0) {
      return "";
    }

    const sections = foods.map((f) => {
      return `**${f.description}** (${f.category})
- FDC ID: ${f.fdcId}
- Serving: ${f.servingSize}g, ${f.calories} kcal
- Protein: ${f.macros.protein}g | Carbs: ${f.macros.carbs}g | Fat: ${f.macros.fat}g | Fiber: ${f.macros.fiber}g
- Dietary Type: ${f.dietaryType}
- Allergens: ${f.allergens.join(", ") || "None"}
- Regions: ${f.regions.join(", ")}`;
    });

    return `## Available Foods Database\n\n${sections.join("\n\n")}`;
  }

  /**
   * Format cuisine protocols for prompt context
   */
  formatCuisinesForPrompt(cuisines: RegionalCuisineDocument[]): string {
    if (cuisines.length === 0) {
      return "";
    }

    const sections = cuisines.map((c) => {
      return `### ${c.name} (${c.region})
**Cuisine:** ${c.cuisine}
**Condition:** ${c.condition || "General"}

**Staple Ingredients:**
- Grains: ${c.staples.grains.join(", ")}
- Proteins: ${c.staples.proteins.join(", ")}
- Vegetables: ${c.staples.vegetables.join(", ")}
- Spices: ${c.staples.spices.join(", ")}

**Typical Meal Patterns:**
- Breakfast: ${c.mealPatterns.breakfast.join(" | ")}
- Lunch: ${c.mealPatterns.lunch.join(" | ")}
- Dinner: ${c.mealPatterns.dinner.join(" | ")}
- Snacks: ${c.mealPatterns.snacks.join(" | ")}

**Cooking Methods:** ${c.cookingMethods.join(", ")}

**Cultural Notes:** ${c.culturalNotes}`;
    });

    return `## Regional Cuisine Protocols\n\n${sections.join("\n\n")}`;
  }

  /**
   * Format guardrails for prompt context
   */
  formatGuardrailsForPrompt(guardrails: NutritionGuardrail[]): string {
    if (guardrails.length === 0) {
      return "";
    }

    const sections = guardrails.map((g) => {
      let thresholdText = "";
      if (g.type === "minimum" && g.threshold.min !== undefined) {
        thresholdText = `≥${g.threshold.min} ${g.threshold.unit}`;
      } else if (g.type === "maximum" && g.threshold.max !== undefined) {
        thresholdText = `≤${g.threshold.max} ${g.threshold.unit}`;
      } else if (g.type === "range") {
        thresholdText = `${g.threshold.min}–${g.threshold.max} ${g.threshold.unit}`;
      }

      return `**${g.name}** (${g.standard})
- Target: ${g.target}
- Metric: ${g.metric} | Threshold: ${thresholdText}
- Applied to: ${g.appliesTo}
- Rationale: ${g.rationale}`;
    });

    return `## Clinical Guardrails — MUST COMPLY\n\n${sections.join("\n\n")}`;
  }
}

export const nutritionService = new NutritionService();
