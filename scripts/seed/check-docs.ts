/**
 * Debug: show actual Firestore documents for a profile.
 * Run: NODE_ENV=development npx tsx --env-file=.env.local scripts/seed/check-docs.ts
 */
import { db } from "@/lib/firebase/admin";

async function main(): Promise<void> {
  const profileId = "Wr4zi68dAeMuYM8lRhR9fSyVQDr1";
  const profileRef = db.collection("profiles").doc(profileId);

  // Check medications
  const meds = await profileRef.collection("medications").get();
  console.log(`\nMedications in profile ${profileId}: ${meds.size}`);
  for (const doc of meds.docs) {
    const d = doc.data();
    console.log(`  ${doc.id}: userId=${d.userId}, name=${d.name}`);
  }

  // Check embeddings for this profile (subcollection)
  const embedSnap = await db
    .collection("profiles")
    .doc(profileId)
    .collection("embeddings")
    .where("type", "==", "medication")
    .get();
  console.log(
    `\nMedication embeddings for profile=${profileId}: ${embedSnap.size}`,
  );
  for (const doc of embedSnap.docs) {
    const d = doc.data();
    console.log(`  ${doc.id}: content=${String(d.content).slice(0, 100)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
