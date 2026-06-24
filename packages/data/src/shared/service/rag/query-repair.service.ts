import { aiService } from "@/data/shared/service/ai.service";
import { z } from "zod";

export type QueryRepairModelTier = "lite" | "fast" | "pro";

const QueryRepairSchema = z.object({
  rewrittenQuery: z.string().min(3),
  broadenSearch: z.boolean(),
  reason: z.string().min(1),
});

function parseTier(modelTier?: string): QueryRepairModelTier {
  if (modelTier === "lite" || modelTier === "fast" || modelTier === "pro") {
    return modelTier;
  }
  return "fast";
}

export class QueryRepairService {
  async repair(input: {
    userId: string;
    query: string;
    evaluatorReason: string;
    modelTier?: QueryRepairModelTier;
  }): Promise<{
    rewrittenQuery: string;
    broadenSearch: boolean;
    reason: string;
  }> {
    const modelTier = parseTier(input.modelTier);

    const prompt = [
      "You rewrite healthcare retrieval queries for semantic search.",
      "Goal: improve retrieval precision and recall without changing user intent.",
      "Return a concise rewritten query and whether broader retrieval is needed.",
      "Do not invent patient data.",
      "",
      `Original query: ${input.query}`,
      `Evaluator failure reason: ${input.evaluatorReason}`,
      "",
      "Rules:",
      "- Keep patient-specific wording if present (e.g., 'my medications').",
      "- Expand with medical synonyms only when helpful.",
      "- If ambiguity is high, set broadenSearch=true.",
    ].join("\n");

    try {
      const result = await aiService.extractObject(
        QueryRepairSchema,
        [{ role: "user", content: prompt }],
        {
          userId: input.userId,
          skipCredit: true,
          useLite: modelTier === "lite",
          useFast: modelTier === "fast",
        },
      );

      return {
        rewrittenQuery: result.rewrittenQuery.trim(),
        broadenSearch: result.broadenSearch,
        reason: result.reason,
      };
    } catch (error) {
      console.warn("[QueryRepairService] Gemini query repair failed:", error);
      return {
        rewrittenQuery: input.query,
        broadenSearch: true,
        reason: "fallback-no-rewrite",
      };
    }
  }
}

export const queryRepairService = new QueryRepairService();
