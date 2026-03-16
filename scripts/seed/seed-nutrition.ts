/**
 * Seed Nutrition Data — Regional Cuisines & USDA Foods
 *
 * Seeds Firestore with:
 * - Regional cuisine protocols with vector embeddings
 * - USDA food data with vector embeddings
 *
 * Run: npx tsx scripts/seed/seed-nutrition.ts
 */

// Load environment variables before any imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/firebase/admin";
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import {
  REGIONAL_CUISINES,
  USDA_FOODS_SAMPLE,
} from "@/data/diet-plans/seed/nutrition-seed-data";

const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;

/**
 * Seed regional cuisine protocols
 */
async function seedCuisines() {
  console.log("\n[SeedNutrition] Seeding regional cuisines...");

  for (const cuisine of REGIONAL_CUISINES) {
    try {
      // Generate embedding text from all relevant fields
      const embeddingText = [
        cuisine.name,
        cuisine.region,
        cuisine.cuisine,
        cuisine.condition || "",
        cuisine.culturalNotes,
        ...cuisine.typicalIngredients,
        ...cuisine.staples.grains,
        ...cuisine.staples.proteins,
        ...cuisine.mealPatterns.breakfast,
        ...cuisine.mealPatterns.lunch,
        ...cuisine.mealPatterns.dinner,
      ].join(" ");

      console.log(`  Embedding: ${cuisine.id}...`);

      // Generate embedding
      const { embedding } = await embed({
        model: embeddingModel,
        value: embeddingText,
        providerOptions: EMBEDDING_OPTS,
      });

      // Store in Firestore
      const ref = db.collection("regional_cuisines").doc(cuisine.id);
      await ref.set({
        ...cuisine,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`  ✅ Seeded: ${cuisine.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${cuisine.id}:`, error);
    }
  }

  console.log(`\n✅ Seeded ${REGIONAL_CUISINES.length} cuisine protocols`);
}

/**
 * Seed USDA food data
 */
async function seedFoods() {
  console.log("\n[SeedNutrition] Seeding USDA foods...");

  for (const food of USDA_FOODS_SAMPLE) {
    try {
      // Generate embedding text from all relevant fields
      const embeddingText = [
        food.description,
        food.category,
        food.dietaryType,
        ...food.regions,
        "brand" in food && typeof food.brand === "string" ? food.brand : "",
        ...food.nutrients.map((n) => `${n.name} ${n.amount}${n.unit}`),
      ].join(" ");

      console.log(`  Embedding: ${food.fdcId} (${food.description})...`);

      // Generate embedding
      const { embedding } = await embed({
        model: embeddingModel,
        value: embeddingText,
        providerOptions: EMBEDDING_OPTS,
      });

      // Store in Firestore
      const ref = db.collection("nutrition_foods").doc(food.fdcId);
      await ref.set({
        ...food,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`  ✅ Seeded: ${food.description}`);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${food.fdcId}:`, error);
    }
  }

  console.log(`\n✅ Seeded ${USDA_FOODS_SAMPLE.length} food items`);
}

/**
 * Main seed function
 */
async function main() {
  console.log("=".repeat(80));
  console.log("🌱 Nutrition Data Seeding");
  console.log("=".repeat(80));

  const startTime = Date.now();

  try {
    // Seed cuisines
    await seedCuisines();

    // Seed foods
    await seedFoods();

    const duration = Date.now() - startTime;
    console.log("\n" + "=".repeat(80));
    console.log(`✨ Seeding complete in ${(duration / 1000).toFixed(1)}s`);
    console.log("=".repeat(80));
    console.log("\nNext steps:");
    console.log("1. Verify Firestore vector indexes are deployed");
    console.log("   → firebase deploy --only firestore:indexes");
    console.log("2. Test the diet planner agent");
    console.log("   → npx tsx examples/diet-planner-example.ts");
    console.log("");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
