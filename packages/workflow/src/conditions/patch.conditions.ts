/**
 * Named routing conditions for patch/update workflows.
 *
 * Reused in: lab-report-api-flow.workflow.ts (patch graph)
 */

// ── Conditions ────────────────────────────────────────────────────────────────

/**
 * Factory: after `parse_body` in a patch workflow.
 *
 * Routes to a "patch sessionId only" branch when the body carries a sessionId,
 * otherwise falls through to a domain-specific re-process branch.
 *
 * @param thenBranch  Node name to route to when sessionId is present.
 * @param elseBranch  Node name to route to when sessionId is absent.
 *
 * @example
 * // lab-report: patch sessionId vs re-extract
 * .addConditionalEdges(
 *   "parse_body",
 *   patchSessionOrElse("patch_session", "re_extract"),
 *   { patch_session: "patch_session", re_extract: "re_extract" },
 * )
 */
export function patchSessionOrElse<
  ThenBranch extends string,
  ElseBranch extends string,
>(thenBranch: ThenBranch, elseBranch: ElseBranch) {
  return (state: { body: unknown }): ThenBranch | ElseBranch => {
    const sessionId = (state.body as { sessionId?: unknown })?.sessionId;
    return typeof sessionId === "string" && sessionId.trim().length > 0
      ? thenBranch
      : elseBranch;
  };
}
