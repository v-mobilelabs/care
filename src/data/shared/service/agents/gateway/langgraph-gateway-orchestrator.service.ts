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
 *   self-fetching   (dietPlanner, prescription)  → NEVER run RAG
 *   always-rag      (patient, labReport)          → ALWAYS run RAG
 *   routing-only    (triageNurse)                 → NEVER run RAG
 *   continuation turn                             → NEVER run RAG
 *   responseMode=full                             → force RAG for any agent
 *   all others      → heuristic from rag-decision.ts (record-hints / complexity)
 */

import { z } from "zod";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { FileLabel } from "@/data/files";
import type { SessionGroundingCacheDocument } from "@/data/sessions";
import type { ProfileDto } from "@/data/profile";
import { getCachedProfile } from "@/data/cached";
import { aiService } from "@/data/shared/service/ai.service";
import { gatewayAgent, type AgentType, type ClinicalRouting } from "./agent";
import { decideRagRequirement } from "./rag-decision";
import { ragService } from "../../rag/rag.service";
import {
  runAgenticRagLangGraph,
  type RagEvaluationMeta,
  type AgenticRagGraphInput,
} from "../../rag/langgraph-rag-orchestrator.service";
import { tryReuseGrounding } from "./grounding-layer.service";
import {
  buildKnownProfileDirectResponse,
  classifyKnownProfileIntent,
  type KnownProfileIntent,
} from "./known-profile-intent";

// ── RAG policy constants ──────────────────────────────────────────────────────

/**
 * Agents that own their own data-fetching pipeline.
 * Running RAG for these wastes ~1.5 s and adds noise.
 */
const SELF_FETCHING_AGENTS: ReadonlySet<AgentType> = new Set([
  "dietPlanner",
  "prescription",
]);

/**
 * Agents where patient records are always required for a meaningful response.
 */
const ALWAYS_RAG_AGENTS: ReadonlySet<AgentType> = new Set([
  "patient",
  "labReport",
]);

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

const LoadingHintsSchema = z.object({
  loadingHints: z
    .array(z.string().min(3).max(120))
    .min(1)
    .max(4)
    .describe(
      "Patient-facing progress phrases to cycle while the assistant prepares a response",
    ),
});

async function generateLoadingHintsFromLlm(args: {
  input: GatewayOrchestratorInput;
  agentType: AgentType;
  thinkingLevel: "low" | "medium" | "high";
  needsRag: boolean;
  reasoning: string;
}): Promise<string[]> {
  const result = await aiService.extractObject(
    LoadingHintsSchema,
    [
      {
        role: "system",
        content:
          "You generate short patient-facing loading phrases for CareAI. " +
          "Return 2 to 4 concise phrases that sound natural while the assistant prepares a response. " +
          "Do not mention internal systems, models, caches, tools, frameworks, pipelines, routing, orchestration, prompts, tokens, or databases. " +
          "Do not use technical jargon. Do not include quotation marks or numbering. " +
          "Keep each phrase under 60 characters when possible and make them reassuring and relevant to the user's request.",
      },
      {
        role: "user",
        content: JSON.stringify({
          userQuery: args.input.userQuery,
          responseMode: args.input.responseMode,
          hasAttachment: args.input.hasAttachment,
          isContinuationTurn: args.input.isContinuationTurn,
          agentType: args.agentType,
          thinkingLevel: args.thinkingLevel,
          needsRag: args.needsRag,
          reasoning: args.reasoning,
        }),
      },
    ],
    { userId: args.input.userId, useLite: true, skipCredit: true },
  );

  return result.loadingHints;
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
  });

  return { routing };
}

async function inspectKnownContextNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input } = state;
  if (input.hasAttachment) {
    return { profile: null, directResponse: undefined };
  }

  const intent =
    input.knownProfileIntentHint ??
    (await classifyKnownProfileIntent(input.userQuery));
  if (!intent) {
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
 *  2. responseMode=full              → force RAG (deep assessment mode)
 *  3. Self-fetching agents           → skip (diet/prescription own their data)
 *  4. Patient-record agents          → always RAG (profile/lab queries)
 *  5. triageNurse                    → skip (routing-only, no clinical context)
 *  6. hasAttachment                  → RAG (model needs history for file context)
 *  7. Query heuristic (rag-decision) → record-hints / reasoning-hints / length
 */
function gateRagNode(state: OrchestratorState): Partial<OrchestratorState> {
  const { input, routing } = state;
  const agentType = routing?.agent ?? "triageNurse";

  if (state.directResponse) {
    return {
      needsRag: false,
      ragGateReason: state.directResponse.reason,
    };
  }

  if (input.isContinuationTurn) {
    return { needsRag: false, ragGateReason: "continuation-skip" };
  }

  if (input.responseMode === "full") {
    return { needsRag: true, ragGateReason: "full-mode-forced" };
  }

  if (SELF_FETCHING_AGENTS.has(agentType)) {
    return {
      needsRag: false,
      ragGateReason: `self-fetch-agent:${agentType}`,
    };
  }

  if (ALWAYS_RAG_AGENTS.has(agentType)) {
    return {
      needsRag: true,
      ragGateReason: `always-rag-agent:${agentType}`,
    };
  }

  if (agentType === "triageNurse") {
    return { needsRag: false, ragGateReason: "triage-no-rag" };
  }

  if (input.hasAttachment) {
    return { needsRag: true, ragGateReason: "attachment" };
  }

  const decision = decideRagRequirement(input.userQuery, false);
  return {
    needsRag: decision.needsRag,
    ragGateReason: decision.reason,
  };
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

async function generateLoadingHintsNode(
  state: OrchestratorState,
): Promise<Partial<OrchestratorState>> {
  const { input, routing, needsRag } = state;

  if (!routing) {
    return { loadingHints: [] };
  }

  let thinkingLevel = routing.thinkingLevel;
  let reasoning = routing.reasoning;

  if (input.responseMode === "full") {
    thinkingLevel = "high";
    reasoning = `${reasoning}; responseMode=full`;
  } else if (thinkingLevel === "high" && !input.hasAttachment) {
    thinkingLevel = "medium";
    reasoning = `${reasoning}; responseMode=quick`;
  }

  try {
    const loadingHints = await generateLoadingHintsFromLlm({
      input,
      agentType: routing.agent,
      thinkingLevel,
      needsRag,
      reasoning,
    });
    return { loadingHints };
  } catch (error) {
    console.warn(
      "[GatewayOrchestrator] Loading hint generation failed:",
      error,
    );
    return { loadingHints: [] };
  }
}

// ── Node: finalize ────────────────────────────────────────────────────────────

/**
 * Node 4: finalize
 *
 * Assembles the final GatewayOrchestratorOutput from routing + RAG state.
 * Also applies responseMode/thinkingLevel adjustments that were previously
 * done inline in PrepareChatUseCase.
 */
function finalizeNode(state: OrchestratorState): Partial<OrchestratorState> {
  const { input, routing, needsRag } = state;

  if (!routing) {
    throw new Error("[GatewayOrchestrator] finalize reached with no routing");
  }

  let { thinkingLevel } = routing;
  let gatewayReasoning = routing.reasoning;

  if (input.responseMode === "full") {
    thinkingLevel = "high";
    gatewayReasoning = `${gatewayReasoning}; responseMode=full`;
  } else if (thinkingLevel === "high" && !input.hasAttachment) {
    // Quick mode: cap at medium to keep latency acceptable
    thinkingLevel = "medium";
    gatewayReasoning = `${gatewayReasoning}; responseMode=quick`;
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
    .addNode("route_query", routeQueryNode)
    .addNode("inspect_known_context", inspectKnownContextNode)
    .addNode("gate_rag", gateRagNode)
    .addNode("resolve_grounding", resolveGroundingNode)
    .addNode("run_rag", runRagNode)
    .addNode("skip_rag", skipRagNode)
    .addNode("generate_loading_hints", generateLoadingHintsNode)
    .addNode("finalize", finalizeNode)
    .addEdge(START, "route_query")
    .addEdge("route_query", "inspect_known_context")
    .addConditionalEdges(
      "inspect_known_context",
      (state: OrchestratorState) =>
        state.directResponse ? "finalize" : "gate_rag",
      { finalize: "finalize", gate_rag: "gate_rag" },
    )
    .addConditionalEdges(
      "gate_rag",
      (state: OrchestratorState) =>
        state.needsRag ? "resolve_grounding" : "skip_rag",
      { resolve_grounding: "resolve_grounding", skip_rag: "skip_rag" },
    )
    .addConditionalEdges(
      "resolve_grounding",
      (state: OrchestratorState) =>
        state.groundingReused ? "generate_loading_hints" : "run_rag",
      {
        generate_loading_hints: "generate_loading_hints",
        run_rag: "run_rag",
      },
    )
    .addEdge("run_rag", "generate_loading_hints")
    .addEdge("skip_rag", "generate_loading_hints")
    .addEdge("generate_loading_hints", "finalize")
    .addEdge("finalize", END)
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
    result: null,
  };

  const finalState = (await orchestratorGraph.invoke(
    initialState,
  )) as OrchestratorState;

  const result = finalState.result;
  if (!result) {
    // Fallback — should never reach here in practice
    return {
      agentType: "triageNurse",
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
