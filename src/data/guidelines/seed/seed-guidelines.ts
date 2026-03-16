/**
 * Seed Guidelines Script
 *
 * Run this script to seed Firestore with clinical guidelines.
 * Each guideline will be embedded and stored with its vector.
 *
 * Usage:
 *   npx tsx src/data/guidelines/seed/seed-guidelines.ts
 *
 * Note: Make sure .env.local exists with Firebase credentials
 */

// Load environment variables FIRST, before any other imports
import * as fs from "node:fs";
import * as path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["'](.*)["']$/, "$1");
      process.env[key] = value;
    }
  });
  console.log("✅ Loaded environment variables from .env.local\n");
} else {
  console.warn(
    "⚠️  .env.local not found, using existing environment variables\n",
  );
}

// Now import Firebase and AI SDK after env vars are loaded
import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { GUIDELINES } from "./guideline-seed-data";

// gemini-embedding-001 (768 dims) — available via v1beta with this API key.
const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;
const COLLECTION = "guidelines";

async function seedGuidelines() {
  console.log(`\n🌱 Seeding ${GUIDELINES.length} clinical guidelines...\n`);

  try {
    // 1. Embed all guidelines in batch
    const embedStart = performance.now();
    console.log("📊 Generating embeddings...");

    const contents = GUIDELINES.map(
      (g) =>
        `${g.condition} ${g.category} ${g.keywords.join(" ")} ${g.content}`,
    );

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: contents,
      providerOptions: EMBEDDING_OPTS,
    });

    console.log(
      `✅ Embeddings generated: ${(performance.now() - embedStart).toFixed(0)}ms\n`,
    );

    // 2. Store each guideline in Firestore
    console.log("💾 Storing guidelines in Firestore...\n");

    const batch = db.batch();
    let count = 0;

    for (let i = 0; i < GUIDELINES.length; i++) {
      const guideline = GUIDELINES[i];
      const embedding = embeddings[i];

      const docRef = db.collection(COLLECTION).doc(guideline.id);

      batch.set(docRef, {
        category: guideline.category,
        condition: guideline.condition,
        icd10: guideline.icd10,
        content: guideline.content,
        keywords: guideline.keywords,
        source: guideline.source,
        embedding: FieldValue.vector(embedding),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      count++;
      console.log(
        `  [${count}/${GUIDELINES.length}] ${guideline.category}: ${guideline.condition}`,
      );
    }

    await batch.commit();

    console.log(`\n✅ Successfully seeded ${count} guidelines to Firestore\n`);
    console.log("🎉 Seeding complete!\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedGuidelines()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedGuidelines };
