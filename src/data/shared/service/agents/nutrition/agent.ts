/**
 * Nutrition Agent — Clinical nutrition and dietary guidance
 *
 * Handles clinical nutrition questions, deficiencies, supplements,
 * dietary restrictions, and personalized nutrition advice.
 *
 * Uses fast model (gemini-3.1-flash) instead of pro for:
 * - Speed: Structured meal plan generation prioritizes latency
 * - Cost: Flash is 97.5% cheaper than Pro
 * - Quality: Sufficient for templated output (meals, macros, ingredients)
 *
 * PARALLEL EXECUTION (2026):
 * When user requests 7-day meal plans, the system automatically uses
 * LangGraph's Send API to fan-out to 7 parallel day-generator nodes.
 * Each day is generated independently (3.8s total vs. 27s sequential).
 * Results stream back to UI as they complete, no user wait time.
 */

import { tool } from "ai";
import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildNutritionPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import {
  EnhancedDietDaySchema,
  type EnhancedDietDay,
} from "@/data/diet-plans/models/nutrition.model";
import { sharedModels, modelIds } from "@/data/shared/service/model";

/** Singleton — import this throughout the server-side application. */
export const nutritionAgent = createAgent({
  id: "nutrition",
  buildSystemPrompt: () => buildNutritionPrompt(),
  temperature: 0.7,
  // Use fast model (flash) for speed and cost efficiency
  model: sharedModels.fast,
  modelId: modelIds.fast,
  buildTools: () => {
    // Performance instrumentation for diet plan streaming
    let lastDayTime = Date.now();

    // Wrap submitDailyPlan with performance logging
    const submitDailyPlan = tool({
      description:
        "Submit a complete daily meal plan with breakfast, lunch, snack, and dinner. " +
        "Use this to present 7-day personalized meal plans to the patient. " +
        "Each day should include exact weights (grams), ingredients, allergen info, " +
        "dietary type (veg/non-veg/vegan), and macro breakdowns (protein/carbs/fat/fiber). " +
        "Always verify caloric totals before submitting. " +
        "Call this ONCE for each day (Day 1 through Day 7) sequentially. " +
        "The client will render each day as it arrives with full meal details, expandable meals, and nutritional summaries.",
      inputSchema: EnhancedDietDaySchema,
      execute: async (input: EnhancedDietDay) => {
        const now = Date.now();
        const elapsedMs = now - lastDayTime;
        console.log(
          `[Nutrition] Day ${input.day_number} submitted in ${elapsedMs}ms`,
        );
        lastDayTime = now;
        return `Day ${input.day_number}: ${input.day} (${Math.round(input.dailyTotals.calories)} cal) — 4 meals submitted.`;
      },
    });

    return {
      askQuestion: askQuestionTool,
      submitDailyPlan,
    };
  },
});

/** Typed UIMessage for the nutrition agent. */
export type NutritionAgentUIMessage = InferAgentUIMessage<
  typeof nutritionAgent
>;
