/**
 * Named routing conditions for `rag-orchestrator.workflow.ts`.
 *
 * Each condition maps an evaluation result to the next node in the agentic
 * RAG pipeline: initial → repair → web-fallback → failed.
 */

// ── Minimal state contracts ───────────────────────────────────────────────────

type WithEvaluation = { evaluation: { pass: boolean } | null };
type WithInputQuery = { input: { userQuery: string } };

// ── Conditions ────────────────────────────────────────────────────────────────

/**
 * After `initial_retrieve_evaluate`:
 *   - evaluation passes → accept initial results → `final_initial`
 *   - evaluation fails  → attempt query repair → `repair_and_retrieve_evaluate`
 */
export function initialEvalRoute<S extends WithEvaluation>(
  state: S,
): "final_initial" | "repair_and_retrieve_evaluate" {
  return state.evaluation?.pass
    ? "final_initial"
    : "repair_and_retrieve_evaluate";
}

/**
 * Factory: after `repair_and_retrieve_evaluate`.
 *
 * Needs access to the evaluator's web-fallback heuristic at graph-build time.
 *
 * @param shouldUseWebFallback  Predicate from `retrievalEvaluatorService.shouldUseWebFallback`.
 *
 * @example
 * .addConditionalEdges(
 *   RAG_NODES.REPAIR_AND_RETRIEVE_EVALUATE,
 *   makeRepairEvalRoute(retrievalEvaluatorService.shouldUseWebFallback),
 *   { ... },
 * )
 */
export function makeRepairEvalRoute<S extends WithEvaluation & WithInputQuery>(
  shouldUseWebFallback: (query: string) => boolean,
) {
  return (
    state: S,
  ): "final_repaired" | "web_fallback_evaluate" | "final_failed" => {
    if (state.evaluation?.pass) return "final_repaired";
    if (shouldUseWebFallback(state.input.userQuery))
      return "web_fallback_evaluate";
    return "final_failed";
  };
}

/**
 * After `web_fallback_evaluate`:
 *   - evaluation passes → accept web-augmented results → `final_web`
 *   - evaluation fails  → give up, return empty context → `final_failed`
 */
export function webFallbackEvalRoute<S extends WithEvaluation>(
  state: S,
): "final_web" | "final_failed" {
  return state.evaluation?.pass ? "final_web" : "final_failed";
}
