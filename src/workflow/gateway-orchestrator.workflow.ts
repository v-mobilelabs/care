/**
 * LangGraph Gateway Orchestrator
 *
 * Single StateGraph that owns the full request lifecycle:
 *   1. Route query  → keyword fast-path → session-cache → LLM fallback
 *   2. Gate RAG     → agent-type rules + query semantics decide if data is needed
 *   3. Run RAG      → only when step 2 says yes (agentic evaluate→repair→web graph)
 *
 * Key principle: "If not required, it should not get the data."
 *
 * RAG policy by agent type:
 *   continuation turn                             → NEVER run RAG
 *   responseMode=full                             → force RAG for any agent
 *   hasAttachment                                 → RAG (file context needed)
 *   all others      → heuristic from rag-decision.ts (record-hints / complexity)
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { FileLabel } from "@/data/files";
import type { SessionGroundingCacheDocument } from "@/data/sessions";
import type { ProfileDto } from "@/data/profile";
import { getCachedProfile } from "@/data/cached";
import {
  gatewayAgent,
  type AgentType,
  type ClinicalRouting,
} from "@/data/shared/service/agents/gateway/agent";
import { decideRagRequirement } from "@/data/shared/service/agents/gateway/rag-decision";
import { ragService } from "@/data/shared/service/rag/rag.service";
import {
  runAgenticRagLangGraph,
  type RagEvaluationMeta,
  type AgenticRagGraphInput,
} from "@/workflow/rag-orchestrator.workflow";
import { tryReuseGrounding } from "@/data/shared/service/agents/gateway/grounding-layer.service";
import {
  buildKnownProfileDirectResponse,
  classifyKnownProfileIntentFast,
  type KnownProfileIntent,
} from "@/data/shared/service/agents/gateway/known-profile-intent";
import {
  directResponseOrGateRag,
  ragGateRoute,
  groundingOrRunRag,
} from "@/workflow/conditions/gateway.conditions";
import { GATEWAY_NODES } from "@/workflow/edges/node-names";
import { FALLBACK_USER_QUERY } from "@/lib/chat/helpers";

// ── RAG policy constants ──────────────────────────────────────────────────────

/**
 * Agents that own their own data-fetching pipeline.
 * Running RAG for these wastes ~1.5 s and adds noise.
 */
const SELF_FETCHING_AGENTS: ReadonlySet<AgentType> = new Set([
  "nutrition", // Uses agentic RAG: getPatientProfile → decide what to fetch → search only if needed
]);

/**
 * Conversational queries (greetings, small-talk) that never need patient
 * records regardless of responseMode. Mirrors TRIAGE_FALLBACK_EXACT from
 * the gateway agent.
 */
const CONVERSATIONAL_EXACT = new Set([
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "help",
  "can you help me",
  "i need help",
  "not sure",
  "i'm not sure",
  "i dont know",
  "i don't know",
  "idk",
  "thanks",
  "thank you",
  "ok",
  "okay",
  "bye",
  "goodbye",
]);

function isConversationalQuery(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  if (CONVERSATIONAL_EXACT.has(trimmed)) return true;
  // Very short non-clinical queries (1-2 words)
  const words = trimmed.split(/\s+/);
  return words.length <= 2 && !CONVERSATIONAL_EXACT.has(trimmed);
}

async function fetchCachedProfileContext(
  userId: string,
): Promise<ProfileDto | null> {
  const profile = await getCachedProfile(userId).catch((error) => {
    console.warn(
      `[GatewayOrchestrator] Profile context lookup failed for ${userId}:`,
      error,
    );
    return null;
  });

  return profile && "kind" in profile ? profile : null;
}

// ── Public I/O types ──────────────────────────────────────────────────────────

export interface GatewayOrchestratorInput {
  userId: string;
  profileId: string;
  userQuery: string;
  profile?: ProfileDto | null;
  hasAttachment: boolean;
  isContinuationTurn: boolean;
  lastAgentType?: string;
  recentMessages?: string[];
  attachmentMetadata?: Array<{
    fileId?: string;
    url: string;
    mediaType: string;
    fileName?: string;
    label?: FileLabel;
    extractedSummary?: {
      testName?: string;
      labName?: string;
      notes?: string;
      biomarkerNames: string[];
    };
  }>;
  reportHandoff?: {
    nextSpecialist: string;
    autoRoute?: boolean;
    reason?: string;
    reportLabel?: string;
  };
  groundingCache?: SessionGroundingCacheDocument[] | null;
  sessionId: string;
  knownProfileIntentHint?: KnownProfileIntent | null;
  responseMode: "quick" | "full";
  // RAG config forwarded to the agentic RAG sub-graph
  evaluatorModel: "lite" | "fast" | "pro";
  repairModel: "lite" | "fast" | "pro";
  webFallbackTimeoutMs: number;
  /**
   * Live Promise for the LLM RAG intent classifier, started in resolveGatewayState
   * before the orchestrator runs. gate_rag awaits it with a capped budget of
   * CLASSIFIER_TOTAL_WINDOW_MS (800ms). Warm models (~300ms) resolve before gate_rag
   * arrives; cold models time out and fall back to the keyword heuristic.
   *
   * Null/undefined when classification is not applicable (continuation / attachment).
   */
  ragIntentClassifierPromise?: Promise<{
    needsRag: boolean;
    reason: "llm-classified" | "llm-fallback";
  } | null> | null;
  /**
   * Epoch ms when classifyRagNeedLLM() was called (Date.now() at fire time).
   * Used by gate_rag to compute the true remaining budget within the 800ms window.
   */
  ragClassifierStartedAtMs?: number | null;
}

export interface GatewayOrchestratorOutput {
  agentType: AgentType;
  thinkingLevel: "low" | "medium" | "high";
  needsRag: boolean;
  reasoning: string;
  loadingHints: string[];
  ragContext: string | null;
  queryEmbedding?: number[];
  directResponse?: {
    text: string;
    source: "known-profile-context";
    reason: string;
  };
  /** Safety classification from unified preflight LLM call. Undefined when
   *  the gateway used a deterministic fast-path (keyword/cache/attachment). */
  safety?: "safe" | "harmful" | "injection" | "off-topic";
  ragMeta: {
    requested: boolean;
    used: boolean;
    reused: boolean;
    reason: string;
    timedOut: boolean;
    partialFailure: boolean;
    evaluation?: RagEvaluationMeta;
  };
}

// ── Internal graph state ──────────────────────────────────────────────────────

interface OrchestratorState {
  input: GatewayOrchestratorInput;
  routing: ClinicalRouting | null;
  profile: ProfileDto | null;
  directResponse: GatewayOrchestratorOutput["directResponse"];
  needsRag: boolean;
  ragGateReason: string;
  queryEmbedding: number[] | null;
  ragContext: string | null;
  ragTimedOut: boolean;
  ragPartialFailure: boolean;
  ragEvaluation: RagEvaluationMeta | null;
  groundingReused: boolean;
  loadingHints: string[];
  /** Safety from unified preflight (when LLM route used). */
  safety: GatewayOrchestratorOutput["safety"];
  result: GatewayOrchestratorOutput | null;
}

const OrchestratorAnnotation = Annotation.Root({
  input: Annotation<GatewayOrchestratorInput>(),
  routing: Annotation<ClinicalRouting | null>(),
  profile: Annotation<ProfileDto | null>(),
  directResponse: Annotation<GatewayOrchestratorOutput["directResponse"]>(),
  needsRag: Annotation<boolean>(),
  ragGateReason: Annotation<string>(),
  queryEmbedding: Annotation<number[] | null>(),
  ragContext: Annotation<string | null>(),
  ragTimedOut: Annotation<boolean>(),
  ragPartialFailure: Annotation<boolean>(),
  ragEvaluation: Annotation<RagEvaluationMeta | null>(),
  groundingReused: Annotation<boolean>(),
  loadingHints: Annotation<string[]>(),
  safety: Annotation<GatewayOrchestratorOutput["safety"]>(),
  result: Annotation<GatewayOrchestratorOutput | null>(),
});

// ── Node: route_query ─────────────────────────────────────────────────────────

/**
 * Node 1: route_query
 *
 * Delegates to the existing GatewayAgent which implements a 4-tier decision:
 *   keyword fast-path → attachment analysis → report handoff → session cache → LLM
 *
 * On continuation turns (assistant answering a pending tool-call) the agent
 * affinity is preserved deterministically without calling the LLM.
 */
async function routeQueryNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input } = state;

  // Continuation fast-path — stay with the same specialist, skip LLM routing
  if (input.isContinuationTurn && input.lastAgentType) {
    const routing: ClinicalRouting = {
      agent: input.lastAgentType as AgentType,
      thinkingLevel: "low",
      needsRag: false,
      reasoning: "continuation-fast-path",
      loadingHints: [],
    };
    return { routing };
  }

  const routing = await gatewayAgent.decide({
    userQuery: input.userQuery,
    hasAttachment: input.hasAttachment,
    attachmentMetadata: input.attachmentMetadata,
    reportHandoff: input.reportHandoff,
    recentMessages: input.recentMessages,
    userId: input.userId,
    sessionId: input.sessionId,
    lastAgentType: input.lastAgentType,
    responseMode: input.responseMode,
    isContinuationTurn: input.isContinuationTurn,
  });

  return {
    routing,
    // Propagate unified preflight fields into state
    loadingHints: routing.loadingHints,
    safety: routing.safety,
  };
}

async function inspectKnownContextNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input } = state;
  if (input.hasAttachment) {
    return { profile: null, directResponse: undefined };
  }

  const intent =
    state.routing?.knownProfileIntent ??
    input.knownProfileIntentHint ??
    classifyKnownProfileIntentFast(input.userQuery);
  if (!intent || intent === "none") {
    return { profile: null, directResponse: undefined };
  }

  const profileLookupIds =
    input.userId === input.profileId
      ? [input.userId]
      : [input.userId, input.profileId];

  let profile: ProfileDto | null = input.profile ?? null;
  if (input.profile === undefined) {
    for (const lookupId of profileLookupIds) {
      // Profiles are keyed by authenticated user id in `profiles/{userId}`.
      // Keep profileId as a fallback for legacy/edge contexts.
      profile = await fetchCachedProfileContext(lookupId);

      if (profile) break;
    }
  }

  const directResponse = buildKnownProfileDirectResponse({
    intent,
    profile,
  });

  if (directResponse) {
    console.log(
      `[GatewayOrchestrator] Direct answer available from known profile context (${directResponse.reason})`,
    );

    return {
      profile,
      directResponse,
      needsRag: false,
      ragGateReason: directResponse.reason,
      ragContext: null,
      ragPartialFailure: false,
      ragTimedOut: false,
      groundingReused: false,
      loadingHints: [],
    };
  }

  return { profile, directResponse };
}

// ── Node: gate_rag ────────────────────────────────────────────────────────────

/**
 * Node 2: gate_rag
 *
 * Decides whether patient records / knowledge-base retrieval is needed.
 * Evaluated AFTER routing so it can use the resolved agent type to apply
 * agent-specific rules before falling back to query-level heuristics.
 *
 * Rules (evaluated in priority order):
 *  1. Continuation turn              → skip (context already in conversation)
 *  2. Self-fetching agents (agentic RAG) → skip (agent decides what to fetch)
 *  3. responseMode=full + LLM/keyword check → force RAG only when records needed
 *  5. Live LLM classifier Promise passed via input.ragIntentClassifierPromise.
 *     Started in PrepareChatUseCase at T=0, awaited here with a 300ms remaining
 *     budget. Total classifier window = route_query_time + 300ms ≈ 600ms.
 *     Falls back to keyword heuristic when null (continuation / attachment / timeout).
 */
async function gateRagNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input, routing } = state;
  const agentType = routing?.agent ?? "generalMedicine";

  if (state.directResponse) {
    return {
      needsRag: false,
      ragGateReason: state.directResponse.reason,
    };
  }

  if (input.isContinuationTurn) {
    return { needsRag: false, ragGateReason: "continuation-skip" };
  }

  // Self-fetching agents own their data decisions — skip prefetch RAG
  // This must come BEFORE responseMode=full check
  if (SELF_FETCHING_AGENTS.has(agentType)) {
    return {
      needsRag: false,
      ragGateReason: `self-fetch-agent:${agentType}`,
    };
  }

  // Conversational queries (greetings, small-talk) never need RAG — even in full mode
  if (isConversationalQuery(input.userQuery)) {
    return { needsRag: false, ragGateReason: "conversational-skip" };
  }

  if (input.hasAttachment) {
    // Attachment-only messages (no text → fallback query) have nothing
    // meaningful to search for. The agent has searchPatientRecords tool
    // and can fetch data on-demand after analyzing the file.
    if (input.userQuery === FALLBACK_USER_QUERY) {
      return { needsRag: false, ragGateReason: "attachment-only-no-query" };
    }
    return { needsRag: true, ragGateReason: "attachment" };
  }

  // Dynamic remaining budget for the LLM classifier.
  // The classifier fires at T=0 in resolveGatewayState and runs concurrently
  // with the orchestrator. With the prefetch node removed, gate_rag now runs
  // immediately after route_query (~5ms on cache hit, ~500ms on LLM routing).
  // We cap the total window so a cold lite model cannot block gate_rag indefinitely.
  //
  // Total window = 800ms from classifier fire:
  //   - Warm model (~300ms): resolves before gate_rag even arrives (0ms wait)
  //   - Cold model (~2600ms): times out at 800ms → keyword fallback
  //   - Worst-case orchestrator time: 800ms (vs previously 2618ms)
  const CLASSIFIER_TOTAL_WINDOW_MS = 800;
  const CLASSIFIER_MIN_WAIT_MS = 100; // always give at least 100ms even if budget is 0
  const classification = await (async () => {
    if (!input.ragIntentClassifierPromise) return null;
    const elapsed = input.ragClassifierStartedAtMs
      ? Date.now() - input.ragClassifierStartedAtMs
      : 0;
    const remainingBudget = Math.max(
      CLASSIFIER_MIN_WAIT_MS,
      CLASSIFIER_TOTAL_WINDOW_MS - elapsed,
    );
    const timeout = new Promise<null>((resolve) =>
      setTimeout(resolve, remainingBudget, null),
    );
    return Promise.race([input.ragIntentClassifierPromise, timeout]);
  })();

  if (classification !== null && classification !== undefined) {
    const { needsRag, reason } = classification;
    // In full responseMode, only force RAG when the LLM says records are needed.
    if (input.responseMode === "full" && needsRag) {
      return { needsRag: true, ragGateReason: "full-mode-forced" };
    }
    return { needsRag, ragGateReason: reason };
  }

  // Classifier timed out or unavailable: default to no_rag.
  // The keyword heuristic has too many false positives (e.g. "should" in
  // "I want to check my symptoms and understand what I should do next").
  // Agents have searchPatientRecords and will fetch records on-demand when
  // actually needed — pre-fetching on an ambiguous query is not worth 30s of RAG.
  //
  // Only skip this for responseMode=full where the caller has opted into
  // deeper context at the cost of latency.
  if (input.responseMode === "full") {
    // In full mode, fallback to keyword heuristic to maintain rich context.
    const decision = decideRagRequirement(input.userQuery, false);
    return { needsRag: decision.needsRag, ragGateReason: decision.reason };
  }
  return { needsRag: false, ragGateReason: "classifier-timeout-skip" };
}

async function resolveGroundingNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input, routing, needsRag } = state;

  if (!needsRag || !routing) {
    return { groundingReused: false };
  }

  const reuseResult = await tryReuseGrounding({
    userQuery: input.userQuery,
    agentType: routing.agent,
    responseMode: input.responseMode,
    hasAttachment: input.hasAttachment,
    cachedGrounding: input.groundingCache,
  });

  if (!reuseResult.reused) {
    return {
      queryEmbedding: reuseResult.queryEmbedding,
      groundingReused: false,
    };
  }

  return {
    ragContext: reuseResult.ragContext,
    queryEmbedding: reuseResult.queryEmbedding,
    ragEvaluation: reuseResult.evaluation ?? null,
    ragGateReason: reuseResult.reason,
    ragPartialFailure: false,
    ragTimedOut: false,
    groundingReused: true,
  };
}

// ── Node: run_rag ─────────────────────────────────────────────────────────────

/**
 * Node 3a: run_rag
 *
 * Only reached when gate_rag resolved needsRag=true.
 * Embeds the query then invokes the Agentic RAG LangGraph:
 *   initial-retrieve → evaluate → [repair → re-retrieve → re-evaluate] → [web-fallback → re-evaluate]
 */
async function runRagNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input } = state;

  let embedding = state.queryEmbedding;

  if (!embedding) {
    try {
      embedding = await ragService.embedQuery(input.userQuery);
    } catch (err) {
      console.error("[GatewayOrchestrator] Embedding failed:", err);
      return {
        ragContext: null,
        queryEmbedding: null,
        ragPartialFailure: true,
        ragTimedOut: false,
      };
    }
  }

  const ragInput: AgenticRagGraphInput = {
    userId: input.userId,
    profileId: input.profileId,
    userQuery: input.userQuery,
    queryEmbedding: embedding,
    evaluatorModel: input.evaluatorModel,
    repairModel: input.repairModel,
    webFallbackTimeoutMs: input.webFallbackTimeoutMs,
  };

  try {
    const result = await runAgenticRagLangGraph(ragInput);
    return {
      queryEmbedding: embedding,
      ragContext: result.context,
      ragPartialFailure: result.partialFailure,
      ragEvaluation: result.evaluation,
      ragTimedOut: false,
    };
  } catch (err) {
    console.error("[GatewayOrchestrator] Agentic RAG graph failed:", err);
    return {
      queryEmbedding: embedding,
      ragContext: null,
      ragPartialFailure: true,
      ragTimedOut: false,
    };
  }
}

// ── Node: skip_rag ────────────────────────────────────────────────────────────

/**
 * Node 3b: skip_rag
 *
 * No-op reached when gate_rag resolved needsRag=false.
 * Explicitly sets context to null so finalize has a consistent state.
 */
function skipRagNode(): Partial<OrchestratorState> {
  return {
    ragContext: null,
    ragPartialFailure: false,
    ragTimedOut: false,
    groundingReused: false,
  };
}

/**
 * Node: generate_loading_hints (passthrough)
 *
 * Loading hints are now produced by the unified preflight LLM call and
 * stored in state.loadingHints by routeQueryNode. This node is kept as
 * a graph join point — it simply forwards existing hints.
 */
function generateLoadingHintsNode(
  state: OrchestratorState,
): Partial<OrchestratorState> {
  return { loadingHints: state.loadingHints ?? [] };
}

// ── Node: finalize ────────────────────────────────────────────────────────────

/**
 * Node 4: finalize
 *
 * Assembles the final GatewayOrchestratorOutput from routing + RAG state.
 * Also applies responseMode/thinkingLevel adjustments that were previously
 * done inline in PrepareChatUseCase.
 *
 * Agents that don't benefit from high thinking (structured generation tasks):
 * - nutrition: Fast meal plan generation prioritizes speed over deep reasoning
 * - patient: Q&A about known profile facts
 */
function finalizeNode(state: OrchestratorState): Partial<OrchestratorState> {
  const { input, routing, needsRag } = state;

  if (!routing) {
    throw new Error("[GatewayOrchestrator] finalize reached with no routing");
  }

  const FAST_GENERATION_AGENTS = new Set(["nutrition", "patient"]);

  let { thinkingLevel } = routing;
  let gatewayReasoning = routing.reasoning;

  if (input.responseMode === "full") {
    // Conversational queries + triage: keep gateway's low thinking — no escalation
    if (
      routing.agent === "triageNurse" &&
      routing.thinkingLevel === "low" &&
      isConversationalQuery(input.userQuery)
    ) {
      gatewayReasoning = `${gatewayReasoning}; responseMode=full (conversational, kept low)`;
    } else if (!FAST_GENERATION_AGENTS.has(routing.agent)) {
      // Only escalate to high thinking when the gateway heuristic already
      // determined the query is complex. Low-complexity queries (short,
      // no reasoning/emergency words) stay at medium to avoid the slow
      // pro model for simple questions like "general health inquiry".
      thinkingLevel = routing.thinkingLevel === "low" ? "medium" : "high";
      gatewayReasoning = `${gatewayReasoning}; responseMode=full`;
    } else {
      // Nutrition/patient: use LOW thinking for maximum speed
      thinkingLevel = "low";
      gatewayReasoning = `${gatewayReasoning}; responseMode=full (capped to low for instant streaming)`;
    }
  } else if (thinkingLevel === "high") {
    // Quick mode: always cap at medium for acceptable latency.
    // Flash model handles attachments well enough — no need for pro.
    thinkingLevel = "medium";
    gatewayReasoning = `${gatewayReasoning}; responseMode=quick (capped to medium)`;
  }

  const result: GatewayOrchestratorOutput = {
    agentType: routing.agent,
    thinkingLevel,
    needsRag,
    reasoning: gatewayReasoning,
    loadingHints: state.loadingHints,
    ragContext: state.ragContext ?? null,
    queryEmbedding: state.queryEmbedding ?? undefined,
    directResponse: state.directResponse,
    safety: state.safety,
    ragMeta: {
      requested: needsRag,
      used: needsRag,
      reused: state.groundingReused,
      reason: state.ragGateReason,
      timedOut: state.ragTimedOut,
      partialFailure: state.ragPartialFailure,
      evaluation: state.ragEvaluation ?? undefined,
    },
  };

  return { result };
}

// ── Graph construction ────────────────────────────────────────────────────────

function buildOrchestratorGraph() {
  return new StateGraph(OrchestratorAnnotation)
    .addNode(GATEWAY_NODES.ROUTE_QUERY, routeQueryNode)
    .addNode(GATEWAY_NODES.INSPECT_KNOWN_CONTEXT, inspectKnownContextNode)
    .addNode(GATEWAY_NODES.GATE_RAG, gateRagNode)
    .addNode(GATEWAY_NODES.RESOLVE_GROUNDING, resolveGroundingNode)
    .addNode(GATEWAY_NODES.RUN_RAG, runRagNode)
    .addNode(GATEWAY_NODES.SKIP_RAG, skipRagNode)
    .addNode(GATEWAY_NODES.GENERATE_LOADING_HINTS, generateLoadingHintsNode)
    .addNode(GATEWAY_NODES.FINALIZE, finalizeNode)
    .addEdge(START, GATEWAY_NODES.ROUTE_QUERY)
    .addEdge(GATEWAY_NODES.ROUTE_QUERY, GATEWAY_NODES.INSPECT_KNOWN_CONTEXT)
    .addConditionalEdges(
      GATEWAY_NODES.INSPECT_KNOWN_CONTEXT,
      directResponseOrGateRag,
      {
        finalize: GATEWAY_NODES.FINALIZE,
        gate_rag: GATEWAY_NODES.GATE_RAG,
      },
    )
    .addConditionalEdges(GATEWAY_NODES.GATE_RAG, ragGateRoute, {
      resolve_grounding: GATEWAY_NODES.RESOLVE_GROUNDING,
      skip_rag: GATEWAY_NODES.SKIP_RAG,
    })
    .addConditionalEdges(GATEWAY_NODES.RESOLVE_GROUNDING, groundingOrRunRag, {
      generate_loading_hints: GATEWAY_NODES.GENERATE_LOADING_HINTS,
      run_rag: GATEWAY_NODES.RUN_RAG,
    })
    .addEdge(GATEWAY_NODES.RUN_RAG, GATEWAY_NODES.GENERATE_LOADING_HINTS)
    .addEdge(GATEWAY_NODES.SKIP_RAG, GATEWAY_NODES.GENERATE_LOADING_HINTS)
    .addEdge(GATEWAY_NODES.GENERATE_LOADING_HINTS, GATEWAY_NODES.FINALIZE)
    .addEdge(GATEWAY_NODES.FINALIZE, END)
    .compile();
}

const orchestratorGraph = buildOrchestratorGraph();

// ── Public runner ─────────────────────────────────────────────────────────────

/**
 * Run the LangGraph Gateway Orchestrator.
 *
 * Combines routing + smart RAG gating + RAG execution into a single graph.
 * Returns routing decision + pre-fetched context ready for agent injection.
 *
 * Guardrail, credit-gate, and memory fetch are intentionally left OUTSIDE
 * this graph — they run as fast pre-flight checks before the stream starts,
 * in parallel with this orchestrator.
 */
export async function runGatewayOrchestrator(
  input: GatewayOrchestratorInput,
): Promise<GatewayOrchestratorOutput> {
  const initialState: OrchestratorState = {
    input,
    routing: null,
    profile: null,
    directResponse: undefined,
    needsRag: false,
    ragGateReason: "",
    queryEmbedding: null,
    ragContext: null,
    ragTimedOut: false,
    ragPartialFailure: false,
    ragEvaluation: null,
    groundingReused: false,
    loadingHints: [],
    safety: undefined,
    result: null,
  };

  const finalState = (await orchestratorGraph.invoke(
    initialState,
  )) as OrchestratorState;

  const result = finalState.result;
  if (!result) {
    // Fallback — should never reach here in practice
    return {
      agentType: "generalMedicine",
      thinkingLevel: "low",
      needsRag: false,
      reasoning: "orchestrator-state-missing",
      loadingHints: [],
      ragContext: null,
      directResponse: undefined,
      ragMeta: {
        requested: false,
        used: false,
        reused: false,
        reason: "orchestrator-state-missing",
        timedOut: false,
        partialFailure: true,
      },
    };
  }

  console.log(
    `[GatewayOrchestrator] → ${result.agentType} | rag:${result.needsRag} (${result.ragMeta.reason}) | thinking:${result.thinkingLevel}`,
  );

  return result;
}
