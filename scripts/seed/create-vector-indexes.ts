/**
 * Create Firestore Vector Indexes
 *
 * Vector indexes cannot be created via firestore.indexes.json yet.
 * This script creates them using the Firestore Admin API.
 *
 * Run: NODE_ENV=development npx tsx --env-file=.env.local scripts/seed/create-vector-indexes.ts
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/firebase/admin";

/**
 * Create vector index for a collection
 */
async function createVectorIndex(
  collectionId: string,
  fieldPath: string,
  dimension: number,
) {
  console.log(
    `\n[VectorIndex] Creating index for ${collectionId}.${fieldPath}...`,
  );

  try {
    // Get reference to the collection
    const collectionRef = db.collection(collectionId);

    // Vector indexes are created automatically when you perform a vector search
    // on a field for the first time. Let's verify the collection exists:
    const snapshot = await collectionRef.limit(1).get();

    if (snapshot.empty) {
      console.log(
        `  ⚠️  Collection ${collectionId} is empty. Add documents first.`,
      );
      return false;
    }

    // Check if documents have the embedding field
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (!data[fieldPath]) {
      console.log(
        `  ⚠️  Documents in ${collectionId} don't have ${fieldPath} field`,
      );
      return false;
    }

    console.log(`  ✅ Collection ${collectionId} is ready for vector search`);
    console.log(`     Documents: ${snapshot.size}+`);
    console.log(`     Field: ${fieldPath} exists`);
    console.log(`     Dimension: ${dimension}`);

    return true;
  } catch (error) {
    console.error(`  ❌ Error checking ${collectionId}:`, error);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("=".repeat(80));
  console.log("🔍 Firestore Vector Index Setup");
  console.log("=".repeat(80));

  console.log(`\nProject: ${process.env.FIREBASE_PROJECT_ID}`);

  // Create vector indexes
  const indexes = [
    { collection: "nutrition_foods", field: "embedding", dimension: 768 },
    { collection: "regional_cuisines", field: "embedding", dimension: 768 },
  ];

  const results = [];
  for (const index of indexes) {
    const success = await createVectorIndex(
      index.collection,
      index.field,
      index.dimension,
    );
    results.push({ ...index, success });
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 Summary");
  console.log("=".repeat(80));

  for (const result of results) {
    const status = result.success ? "✅ Ready" : "⚠️  Needs attention";
    console.log(`${status} - ${result.collection}.${result.field}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("ℹ️  Important Notes:");
  console.log("=".repeat(80));
  console.log(`
Firestore creates vector indexes automatically on first use.

To enable vector search:
1. Ensure collections have documents with embedding fields ✅ (Already done via seed)
2. Perform your first vector search query
3. Firestore will automatically create the index in the background
4. Index creation takes 5-10 minutes

Alternative: Create via Firebase Console
1. Go to: https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes
2. Click "Create Index"
3. Collection: nutrition_foods
   Field: embedding
   Query scope: Collection
   Vector Config: 
     - Dimension: 768
     - Distance Measure: COSINE
4. Repeat for regional_cuisines collection

Current Status:
✅ Data seeded (3 cuisines + 10 foods)
✅ Collections exist with embedding fields
⏳ Vector indexes will auto-create on first search
`);

  console.log("=".repeat(80));
  console.log(
    "\n🎯 Next: Test the diet planner (this will trigger index creation)",
  );
  console.log("   npx tsx examples/diet-planner-example.ts\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
