/**
 * Submit Daily Plan Tool — Streaming diet plan with day-wise UI
 *
 * Allows the nutrition agent to submit a complete daily meal plan.
 * The client renders each day in the DietDayCard component with
 * meal accordion expansion, macro breakdowns, and dietary type indicators.
 *
 * Streaming: Each day is rendered as it arrives, no waiting for full plan.
 */

import { tool } from "ai";
import { EnhancedDietDaySchema } from "@/data/diet-plans/models/nutrition.model";

export const submitDailyPlan = tool({
  description:
    "Submit a complete daily meal plan with breakfast, lunch, snack, and dinner. " +
    "Use this to present 7-day personalized meal plans to the patient. " +
    "Each day should include exact weights (grams), ingredients, allergen info, " +
    "dietary type (veg/non-veg/vegan), and macro breakdowns (protein/carbs/fat/fiber). " +
    "Always verify caloric totals before submitting. " +
    "Call this ONCE for each day (Day 1 through Day 7) sequentially. " +
    "The client will render each day as it arrives with full meal details, expandable meals, and nutritional summaries.",
  inputSchema: EnhancedDietDaySchema,
  execute: async (input) =>
    `Day ${input.day_number}: ${input.day} (${Math.round(input.dailyTotals.calories)} cal) — 4 meals submitted.`,
});
