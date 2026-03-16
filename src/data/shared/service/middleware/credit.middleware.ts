/**
 * Credit Middleware — Consumes one credit before any LLM call.
 *
 * Wraps both `generate` and `stream` paths so every model invocation
 * is gated regardless of how the agent invokes the model internally.
 *
 * Uses the monthly usage system (`usage/{profile}`) so the deduction is
 * visible via GET /api/credits which reads from the same collection.
 *
 * Throws `CreditsExhaustedError` (caught by the route handler → 402)
 * when the user has no credits remaining.
 */

import type { LanguageModelMiddleware } from "ai";
import { UsageService } from "@/data/usage/service/lazy-reset-usage.service";
import { UsageRepository } from "@/data/usage/repositories/usage.repository";
import { CreditsExhaustedError } from "@/lib/errors";

const usageService = new UsageService(new UsageRepository());

/**
 * A flag attached to params.providerOptions to prevent double-charging
 * when the ToolLoopAgent retries or chains multiple steps.
 * Only the first LLM call in a stream() invocation consumes a credit.
 */
const CREDIT_CONSUMED_KEY = "__creditConsumed";

export function creditMiddleware(userId: string): LanguageModelMiddleware {
  let consumed = false;

  async function gate(): Promise<void> {
    if (consumed) return;
    consumed = true;
    const usage = await usageService.getUsage(userId);
    if (usage.credits <= 0) throw new CreditsExhaustedError(0);
    await usageService.updateUsage(userId, {
      credits: usage.credits - 1,
    });
  }

  return {
    specificationVersion: "v3" as const,

    wrapGenerate: async ({ doGenerate, params }) => {
      const opts = params.providerOptions as
        | Record<string, unknown>
        | undefined;
      if (opts?.[CREDIT_CONSUMED_KEY]) return doGenerate();
      await gate();
      return doGenerate();
    },

    wrapStream: async ({ doStream, params }) => {
      const opts = params.providerOptions as
        | Record<string, unknown>
        | undefined;
      if (opts?.[CREDIT_CONSUMED_KEY]) return doStream();
      await gate();
      return doStream();
    },
  };
}
