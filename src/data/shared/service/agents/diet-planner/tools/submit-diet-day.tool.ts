/**
 * Submit Daily Plan Tool — Structured diet day submission
 *
 * The diet planner agent calls this tool once per day (7 total) to submit
 * the complete structured meal data for that day. The tool collects all 7
 * days and makes them available as the agent's output.
 */

import { tool, zodSchema } from "ai";
import { EnhancedDietDaySchema } from "@/data/diet-plans/models/nutrition.model";
import type { EnhancedDietDay } from "@/data/diet-plans/models/nutrition.model";

export type { EnhancedDietDay };

/**
 * Build the `submitDailyPlan` tool with a shared collector array.
 * Each day the model calls the tool, it's pushed into `collectedDays`.
 *
 * @param collectedDays - Array that the execute function pushes each day into
 */
export function createSubmitDailyPlanTool(collectedDays: EnhancedDietDay[]) {
  return tool({
    description:
      "Submit the complete structured meal plan for one day. " +
      "Call this tool 7 times — once for each day of the week.",
    inputSchema: zodSchema(EnhancedDietDaySchema),
    execute: async (dayPlan: EnhancedDietDay) => {
      console.log(
        `[DietPlannerChatAgent] Day ${dayPlan.day_number}: ${dayPlan.dailyTotals.calories} kcal`,
      );
      collectedDays.push(dayPlan);
      return {
        status: "accepted",
        day: dayPlan.day_number,
        totalDays: collectedDays.length,
      };
    },
  });
}
