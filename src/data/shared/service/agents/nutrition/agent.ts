/**
 * Nutrition Agent — Clinical nutrition + 7-day meal plans (replaces dietPlanner)
 *
 * Handles both clinical nutrition questions (deficiencies, supplements,
 * dietary restrictions) AND structured 7-day meal plan generation
 * (via submitDailyPlan tool). Absorbs all dietPlanner functionality.
 */

import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildNutritionPrompt } from "./prompt";
import { buildDietDynamicContext } from "../diet-planner/context";
import { createSubmitDailyPlanTool } from "../diet-planner/tools/submit-diet-day.tool";
import type { EnhancedDietDay } from "../diet-planner/tools/submit-diet-day.tool";
import { askQuestionTool } from "../global-tools/ask-question.tool";

export type { EnhancedDietDay };

/** Singleton — import this throughout the server-side application. */
export const nutritionAgent = createAgent({
  id: "nutrition",
  buildSystemPrompt: () => buildNutritionPrompt(),
  buildDynamicContext: (options) => buildDietDynamicContext(options),
  temperature: 0.7,
  maxSteps: 15, // 7 days × ~2 steps each
  buildTools: () => {
    const collectedDays: EnhancedDietDay[] = [];
    return {
      submitDailyPlan: createSubmitDailyPlanTool(collectedDays),
      askQuestion: askQuestionTool,
    };
  },
});

/** Typed UIMessage for the nutrition agent. */
export type NutritionAgentUIMessage = InferAgentUIMessage<
  typeof nutritionAgent
>;
