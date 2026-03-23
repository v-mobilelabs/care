/**
 * Seed Knowledge Base — Clinical guidelines + nutrition guidelines.
 *
 * Seeds Firestore `knowledge_base` collection with all guideline entries
 * (migrated from the legacy `guidelines` collection format).
 *
 * Run: pnpm seed:kb
 */

// Load environment variables before any imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/firebase/admin";
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { FieldValue } from "firebase-admin/firestore";
import { KB_COLLECTION } from "@/data/knowledge-base";
import { KB_SEED_ENTRIES } from "@/data/knowledge-base/seed/kb-seed-data";

const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;

async function seedKnowledgeBase() {
  console.log(
    `[SeedKB] Seeding ${KB_SEED_ENTRIES.length} knowledge base entries...\n`,
  );

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of KB_SEED_ENTRIES) {
    // Skip if already exists (idempotent)
    const existing = await db.collection(KB_COLLECTION).doc(entry.id).get();
    if (existing.exists) {
      console.log(`  ⏭️  Skipped (exists): ${entry.title}`);
      skipped++;
      continue;
    }

    try {
      const embeddingText = [
        entry.title,
        entry.category,
        entry.subcategory ?? "",
        entry.content,
        ...(entry.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ");

      console.log(`  Embedding: ${entry.title}...`);

      const { embedding } = await embed({
        model: embeddingModel,
        value: embeddingText,
        providerOptions: EMBEDDING_OPTS,
      });

      const now = new Date();
      await db
        .collection(KB_COLLECTION)
        .doc(entry.id)
        .set({
          title: entry.title,
          type: entry.type,
          category: entry.category,
          subcategory: entry.subcategory ?? null,
          content: entry.content,
          tags: entry.tags,
          source: entry.source ?? null,
          sourceUrl: null,
          status: "active",
          metadata: {},
          file: null,
          embedding: FieldValue.vector(embedding),
          createdAt: now,
          updatedAt: now,
        });

      console.log(`  ✅ Seeded: ${entry.title} (${entry.id})`);
      success++;
    } catch (error) {
      console.error(`  ❌ Failed: ${entry.title}`, error);
      failed++;
    }
  }

  console.log(
    `\n✅ Done — ${success} seeded, ${skipped} skipped, ${failed} failed out of ${KB_SEED_ENTRIES.length} total`,
  );
}

seedKnowledgeBase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
