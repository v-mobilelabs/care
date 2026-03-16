/**
 * Quick debug script — check what's in the embeddings collection.
 * Run: NODE_ENV=development npx tsx --env-file=.env.local scripts/seed/check-embeddings.ts
 */
import { db } from "@/lib/firebase/admin";

async function main(): Promise<void> {
  // List all profiles
  const profilesSnap = await db.collection("profiles").get();
  let total = 0;
  console.log("First 5 embeddings (across all profiles):");
  let shown = 0;
  for (const profileDoc of profilesSnap.docs) {
    const profileId = profileDoc.id;
    const embSnap = await db
      .collection("profiles")
      .doc(profileId)
      .collection("embeddings")
      .limit(5 - shown)
      .get();
    for (const doc of embSnap.docs) {
      const d = doc.data();
      console.log(
        `  profileId: ${profileId} | id: ${doc.id} | userId: ${d.userId} | type: ${d.type} | sourceId: ${d.sourceId}`,
      );
      shown++;
      if (shown >= 5) break;
    }
    if (shown >= 5) break;
  }

  // Count all embeddings
  let allCount = 0;
  const byUserId = new Map<string, number>();
  for (const profileDoc of profilesSnap.docs) {
    const profileId = profileDoc.id;
    const embSnap = await db
      .collection("profiles")
      .doc(profileId)
      .collection("embeddings")
      .get();
    allCount += embSnap.size;
    for (const doc of embSnap.docs) {
      const uid = String(doc.data().userId ?? "UNDEFINED");
      byUserId.set(uid, (byUserId.get(uid) ?? 0) + 1);
    }
  }
  console.log(`\nTotal embeddings: ${allCount}`);
  console.log("\nEmbeddings by userId:");
  for (const [uid, count] of byUserId.entries()) {
    console.log(`  ${uid}: ${count}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
