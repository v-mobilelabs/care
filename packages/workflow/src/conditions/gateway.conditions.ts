/**
 * Named routing conditions for `gateway-orchestrator.workflow.ts`.
 *
 * These replace inline lambdas in `addConditionalEdges` so they:
 *   - can be unit-tested independently
 *   - appear as named references in the graph definition (not anonymous functions)
 *   - document the routing logic at a glance
 *
 * All conditions are generic over their minimal required state shape.
 */

// ── Conditions ────────────────────────────────────────────────────────────────

/**
 * After `inspect_known_context`:
 *   - has a direct response  → skip the full RAG pipeline → `finalize` immediately
 *   - no direct response     → continue to `gate_rag`
 */
export function directResponseOrGateRag<S extends { directResponse?: unknown }>(
  state: S,
): "finalize" | "gate_rag" {
  return state.directResponse ? "finalize" : "gate_rag";
}

/**
 * After `gate_rag`:
 *   - needsRag  → try grounding cache reuse first → `resolve_grounding`
 *   - !needsRag → bypass RAG entirely → `skip_rag`
 */
export function ragGateRoute<S extends { needsRag: boolean }>(
  state: S,
): "resolve_grounding" | "skip_rag" {
  return state.needsRag ? "resolve_grounding" : "skip_rag";
}

/**
 * After `resolve_grounding`:
 *   - grounding reused → cached context is fresh enough → `generate_loading_hints`
 *   - not reused       → run fresh agentic RAG → `run_rag`
 */
export function groundingOrRunRag<S extends { groundingReused: boolean }>(
  state: S,
): "generate_loading_hints" | "run_rag" {
  return state.groundingReused ? "generate_loading_hints" : "run_rag";
}
