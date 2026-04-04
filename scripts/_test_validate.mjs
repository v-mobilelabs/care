import { safeValidateUIMessages, validateUIMessages, tool } from "ai";
import { z } from "zod/v4";

// Recreate the EnhancedDietDaySchema shapes (simplified but valid)
const EnhancedFoodSchema = z.object({
  item: z.string().min(1),
  fdcId: z.string().optional(),
  portion: z.string(),
  weight_grams: z.number().min(1),
  calories: z.number().nonnegative(),
  macros: z.object({
    protein_g: z.number(),
    carbs_g: z.number(),
    fats_g: z.number(),
    fiber_g: z.number(),
  }),
  micronutrients: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
        unit: z.string(),
        dailyValue: z.number().optional(),
      }),
    )
    .optional(),
  ingredients: z.array(z.string()).default([]),
  instructions: z.string().optional(),
  allergens: z.array(z.string()).default([]),
  dietaryType: z.enum(["veg", "non-veg", "vegan"]),
  substitutions: z
    .array(
      z.object({ item: z.string(), region: z.string(), reason: z.string() }),
    )
    .default([]),
});
const EnhancedMealSchema = z.object({
  name: z.string().min(1),
  time: z.string(),
  foods: z.array(EnhancedFoodSchema),
  totalCalories: z.number().nonnegative(),
  totalMacros: z.object({
    protein_g: z.number(),
    carbs_g: z.number(),
    fats_g: z.number(),
    fiber_g: z.number(),
  }),
});
const EnhancedDietDaySchema = z.object({
  day: z.string().min(1),
  day_number: z.number().int().min(1).max(7),
  meals: z.object({
    breakfast: EnhancedMealSchema,
    lunch: EnhancedMealSchema,
    snack: EnhancedMealSchema,
    dinner: EnhancedMealSchema,
  }),
  dailyTotals: z.object({
    calories: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fats_g: z.number(),
    fiber_g: z.number(),
  }),
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

const submitDailyPlan = tool({
  description: "Submit daily meal plan",
  inputSchema: EnhancedDietDaySchema,
  execute: async (input) => `Day ${input.day_number} submitted`,
});
const askQuestion = tool({
  description: "Ask a question",
  inputSchema: z.object({ question: z.string() }),
  execute: async () => "answered",
});
const tools = { askQuestion, submitDailyPlan };

// Make a realistic but minimal valid EnhancedDietDay
function makeFakeDay(n) {
  const food = {
    item: "Rice",
    portion: "1 cup",
    weight_grams: 200,
    calories: 300,
    macros: { protein_g: 5, carbs_g: 60, fats_g: 1, fiber_g: 2 },
    ingredients: [],
    allergens: [],
    dietaryType: "veg",
    substitutions: [],
  };
  const meal = {
    name: `Meal`,
    time: "8:00 AM",
    foods: [food],
    totalCalories: 300,
    totalMacros: { protein_g: 5, carbs_g: 60, fats_g: 1, fiber_g: 2 },
  };
  return {
    day: `Day ${n}: Test`,
    day_number: n,
    meals: { breakfast: meal, lunch: meal, snack: meal, dinner: meal },
    dailyTotals: {
      calories: 1200,
      protein_g: 20,
      carbs_g: 240,
      fats_g: 4,
      fiber_g: 8,
    },
    guardrailCompliance: [],
  };
}

// Test 5: With tools + realistic data
console.log("--- Test 5: With tools and realistic EnhancedDietDay ---");
const parts = Array.from({ length: 7 }, (_, i) => ({
  type: "tool-submitDailyPlan",
  toolCallId: `parallel-day-${i + 1}`,
  state: "output-available",
  input: makeFakeDay(i + 1),
  output: `Day ${i + 1} submitted`,
}));
const messages5 = [
  {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "create diet plan" }],
  },
  { id: "msg-2", role: "assistant", parts },
  { id: "msg-3", role: "user", parts: [{ type: "text", text: "hi" }] },
];
const r5 = await safeValidateUIMessages({ messages: messages5, tools });
console.log("Result:", r5.success ? "VALID" : "INVALID");
if (!r5.success) {
  const cause = r5.error?.cause;
  console.log("Error type:", r5.error?.constructor?.name);
  console.log("Error message:", r5.error?.message?.substring(0, 300));
  if (cause?.issues)
    console.log("Issues:", JSON.stringify(cause.issues.slice(0, 2), null, 2));
}

// Test 6: With tools + bad input (missing required fields)
console.log("\n--- Test 6: With tools + incomplete input (no meals) ---");
const badParts = Array.from({ length: 7 }, (_, i) => ({
  type: "tool-submitDailyPlan",
  toolCallId: `parallel-day-${i + 1}`,
  state: "output-available",
  input: {
    day: `Day ${i + 1}`,
    day_number: i + 1,
    dailyTotals: { calories: 800 },
  },
  output: `Day ${i + 1} submitted`,
}));
const messages6 = [
  {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "create diet plan" }],
  },
  { id: "msg-2", role: "assistant", parts: badParts },
  { id: "msg-3", role: "user", parts: [{ type: "text", text: "hi" }] },
];
const r6 = await safeValidateUIMessages({ messages: messages6, tools });
console.log("Result:", r6.success ? "VALID" : "INVALID");
if (!r6.success) {
  const cause = r6.error?.cause;
  console.log("Error type:", r6.error?.constructor?.name);
  console.log("Error msg:", r6.error?.message?.substring(0, 500));
  if (cause?.issues)
    console.log("Issues:", JSON.stringify(cause.issues?.slice(0, 3), null, 2));
}
