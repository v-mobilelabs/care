/**
 * Debug: show actual medication embeddings for the user.
 * Run: NODE_ENV=development npx tsx --env-file=.env.local scripts/seed/check-meds.ts
 */
import { db } from "@/lib/firebase/admin";

async function main(): Promise<void> {
  const profileId = "Wr4zi68dAeMuYM8lRhR9fSyVQDr1";
  const snap = await db
    .collection("profiles")
    .doc(profileId)
    .collection("embeddings")
    .where("type", "in", ["medication", "prescription"])
    .get();

  console.log(
    `Medication/prescription embeddings for profile=${profileId}: ${snap.size}`,
  );
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`\n--- ${doc.id} ---`);
    console.log("type:", d.type);
    console.log("sourceId:", d.sourceId);
    console.log("content:", String(d.content).slice(0, 200));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
