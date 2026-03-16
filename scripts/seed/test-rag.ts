/**
 * Test RAG search directly for the mouth gel query.
 * Run: NODE_ENV=development npx tsx --env-file=.env.local scripts/seed/test-rag.ts
 */
import { ragContextBuilder } from "@/data/shared/service";

async function main(): Promise<void> {
  const result = await ragContextBuilder.buildContext({
    userId: "Wr4zi68dAeMuYM8lRhR9fSyVQDr1",
    profileId: "Wr4zi68dAeMuYM8lRhR9fSyVQDr1",
    query: "What mouth gel I am using",
    rerank: false, // Skip reranking for faster test
  });

  console.log(`\nRAG results: ${result.count} chunks`);
  console.log("\nContext built:");
  console.log(result.context.slice(0, 1000));
  console.log("\nTop results:");
  for (const r of result.results.slice(0, 5)) {
    console.log(
      `  score: ${r.score.toFixed(3)} | type: ${r.chunk.type} | content: ${r.chunk.content.slice(0, 100)}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
