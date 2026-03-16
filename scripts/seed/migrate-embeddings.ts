/**
 * Migration: Move embeddings from top-level `embeddings` collection
 * to subcollections under `profiles/{profileId}/embeddings`.
 *
 * Run:
 *   NODE_ENV=development npx tsx --env-file=.env.local scripts/seed/migrate-embeddings.ts
 *
 * Options (env vars):
 *   DRY_RUN=true       — Preview without writing (default: false)
 *   BATCH_SIZE=100      — Docs per batch commit (default: 100)
 *   DELETE_OLD=true      — Delete old docs after migration (default: false)
 */
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/firebase/admin";

const DRY_RUN = process.env.DRY_RUN === "true";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "100", 10);
const DELETE_OLD = process.env.DELETE_OLD === "true";

async function main(): Promise<void> {
  console.log(
    `[migrate-embeddings] Starting migration${DRY_RUN ? " (DRY RUN)" : ""}…`,
  );
  console.log(`  BATCH_SIZE=${BATCH_SIZE}, DELETE_OLD=${DELETE_OLD}`);

  const oldCollection = db.collection("embeddings");
  const allDocs = await oldCollection.get();

  console.log(
    `[migrate-embeddings] Found ${allDocs.size} docs in old collection`,
  );

  if (allDocs.empty) {
    console.log("[migrate-embeddings] Nothing to migrate.");
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of allDocs.docs) {
    const data = doc.data();
    const profileId = data.profileId ?? data.userId;

    if (!profileId) {
      console.warn(`  ⚠ Skipping ${doc.id} — no profileId or userId`);
      skipped++;
      continue;
    }

    const newRef = db
      .collection("profiles")
      .doc(profileId)
      .collection("embeddings")
      .doc(doc.id);

    // Check if already migrated
    const existing = await newRef.get();
    if (existing.exists) {
      skipped++;
      if (DELETE_OLD && !DRY_RUN) {
        batch.delete(doc.ref);
        batchCount++;
        deleted++;
      }
    } else {
      if (!DRY_RUN) {
        batch.set(newRef, data);
        batchCount++;
      }
      migrated++;

      if (DELETE_OLD && !DRY_RUN) {
        batch.delete(doc.ref);
        batchCount++;
        deleted++;
      }
    }

    // Commit batch when full
    if (batchCount >= BATCH_SIZE) {
      if (!DRY_RUN) await batch.commit();
      batch = db.batch();
      batchCount = 0;
      console.log(
        `  … committed batch (migrated=${migrated}, skipped=${skipped})`,
      );
    }
  }

  // Final batch
  if (batchCount > 0 && !DRY_RUN) {
    await batch.commit();
  }

  console.log(`\n[migrate-embeddings] ✅ Done.`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  if (DELETE_OLD) console.log(`  Deleted from old collection: ${deleted}`);
  if (DRY_RUN) console.log(`  (DRY RUN — no writes were made)`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error("[migrate-embeddings] ❌ Fatal:", e);
    process.exit(1);
  });
