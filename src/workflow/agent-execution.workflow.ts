import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { ModelMessage, ToolSet } from "ai";
import type { ProfileDto } from "@/data/profile";
import { getCachedProfile } from "@/data/cached";
import { getContextCache } from "@/data/shared/service/middleware/cached-content.middleware";
import type { PreRunContext } from "@/data/shared/service/middleware/pre-run";
import { actionCard } from "@/data/shared/service/agents/base/tools/action-card.tool";
import { createMemoryTool } from "@/data/shared/service/agents/base/tools/memory.tool";
import { submitReportTool } from "@/data/shared/service/agents/base/tools/submit-report.tool";
import { submitReferralRequestTool } from "@/data/shared/service/agents/base/tools/submit-referral-request.tool";
import { createGetPatientProfileTool } from "@/data/shared/service/agents/global-tools/get-patient-profile.tool";
import { createGetMedicationsTool } from "@/data/shared/service/agents/global-tools/get-medications.tool";
import { createSearchPatientRecordsTool } from "@/data/shared/service/agents/global-tools/search-patient-records.tool";

export type AgentThinkingLevel = "low" | "medium" | "high";

type AgentAssessmentConfig = {
  adaptiveMode?: boolean;
};

export interface AgentExecutionOptions {
  userId: string;
  profileId: string;
  userQuery: string;
  sessionId: string;
  responseMode?: "quick" | "full";
  hasAttachment?: boolean;
  queryEmbedding?: number[];
  profile?: ProfileDto | null;
  thinkingLevel?: AgentThinkingLevel;
  needsRag?: boolean;
  preContext?: PreRunContext;
  assessmentConfig?: AgentAssessmentConfig;
  checkpointMetadata?: {
    threadId: string;
    checkpointPrefix: string; // e.g., "chat_${sessionId}_${agentType}"
  };
}

export interface AgentExecutionGraphConfig {
  id: string;
  staticPrompt: string;
  buildTools: (options: AgentExecutionOptions) => ToolSet;
  buildDynamicContext?: (
    options: AgentExecutionOptions,
  ) => string | Promise<string>;
  assessmentConfig?: AgentAssessmentConfig;
  modelId: string;
  fastModelId: string;
  useThinking: boolean;
  allowActionCard: boolean;
}

async function fetchCachedProfile(
  profileId: string,
): Promise<ProfileDto | null> {
  const profile = await getCachedProfile(profileId).catch(() => null);
  return profile && "kind" in profile ? profile : null;
}

export interface PreparedAgentRuntime {
  tools: ToolSet;
  staticPrompt: string;
  dynamicContext: string;
  thinkingLevel?: AgentThinkingLevel;
  useFast: boolean;
  activeModelId: string;
  cacheName: string | null;
  trace: string[];
  checkpointContext?: {
    threadId: string;
    checkpointPrefix: string;
  };
}

interface AgentExecutionState {
  options: AgentExecutionOptions;
  tools: ToolSet;
  staticPrompt: string;
  dynamicContext: string;
  thinkingLevel?: AgentThinkingLevel;
  useFast: boolean;
  activeModelId: string;
  cacheName: string | null;
  trace: string[];
  result: PreparedAgentRuntime | null;
}

function buildProfileContext(profile: ProfileDto): string {
  const age = profile.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(profile.dateOfBirth).getTime()) / 31_557_600_000,
      )
    : undefined;
  const ageSuffix = age === undefined ? "" : ` (Age: ${age})`;
  const lines = [
    `- ID: ${profile.userId}`,
    `- Kind: ${profile.kind}`,
    profile.name && `- Name: ${profile.name}`,
    profile.gender && `- Gender: ${profile.gender}`,
    profile.city && `- City: ${profile.city}`,
    profile.country && `- Country: ${profile.country}`,
    profile.dateOfBirth &&
      `- Date of Birth: ${profile.dateOfBirth}${ageSuffix}`,
  ].filter(Boolean);
  return `## Patient Profile\n${lines.join("\n")}`;
}

function buildCurrentDateContext(now: Date = new Date()): string {
  return `## Current Date\n- Today: ${now.toISOString().slice(0, 10)}`;
}

function buildResponseModeContext(responseMode?: "quick" | "full"): string {
  if (responseMode === "full") {
    return "## Response Mode\n- Mode: Full assessment\n- Prioritize deeper reasoning, differential considerations, and clear follow-up steps.\n- Prefer structured outputs with rationale, risks, and next actions when relevant.";
  }

  return "## Response Mode\n- Mode: Quick guidance\n- Keep responses concise and action-oriented while maintaining medical safety.\n- Ask only essential follow-up questions before giving next-step guidance.";
}

function finalizeRuntimeNode(
  state: AgentExecutionState,
): Partial<AgentExecutionState> {
  const trace = [...state.trace, "finalize_runtime"];
  return {
    result: {
      tools: state.tools,
      staticPrompt: state.staticPrompt,
      dynamicContext: state.dynamicContext,
      thinkingLevel: state.thinkingLevel,
      useFast: state.useFast,
      activeModelId: state.activeModelId,
      cacheName: state.cacheName,
      trace,
      ...(state.options.checkpointMetadata
        ? { checkpointContext: state.options.checkpointMetadata }
        : {}),
    },
  };
}

function makePrepareContextNode(config: AgentExecutionGraphConfig) {
  return async (
    state: AgentExecutionState,
  ): Promise<Partial<AgentExecutionState>> => {
    const enrichedOptions: AgentExecutionOptions = {
      ...state.options,
      ...(config.assessmentConfig
        ? { assessmentConfig: config.assessmentConfig }
        : {}),
    };

    const [tools, profile] = await Promise.all([
      Promise.resolve({
        ...config.buildTools(enrichedOptions),
        memory: createMemoryTool(
          enrichedOptions.userId,
          enrichedOptions.profileId,
          enrichedOptions.sessionId,
        ),
        getPatientProfile: createGetPatientProfileTool(enrichedOptions.userId),
        getMedications: createGetMedicationsTool(enrichedOptions.userId),
        searchPatientRecords: createSearchPatientRecordsTool(
          enrichedOptions.userId,
          enrichedOptions.profileId,
        ),
        ...(config.allowActionCard ? { actionCard } : {}),
        submitReport: submitReportTool,
        submitReferralRequest: submitReferralRequestTool,
      } as ToolSet),
      enrichedOptions.profile === undefined
        ? fetchCachedProfile(enrichedOptions.profileId)
        : Promise.resolve(enrichedOptions.profile),
    ]);

    const staticPrompt = config.staticPrompt;
    const agentDynamicContext =
      (await config.buildDynamicContext?.(enrichedOptions)) ?? "";
    const profileContext = profile ? buildProfileContext(profile) : "";
    const responseModeContext = buildResponseModeContext(
      enrichedOptions.responseMode,
    );
    const currentDateContext = buildCurrentDateContext();
    const dynamicContext = [
      currentDateContext,
      profileContext,
      responseModeContext,
      agentDynamicContext,
    ]
      .filter(Boolean)
      .join("\n\n");

    console.log(
      `[${config.id}] Instructions: static ${staticPrompt.length} chars + dynamic ${dynamicContext.length} chars | Tools: ${Object.keys(tools).join(", ")}`,
    );

    const trace = [...state.trace, "prepare_context"];
    return { tools, staticPrompt, dynamicContext, trace };
  };
}

function makeSelectModelNode(config: AgentExecutionGraphConfig) {
  return (state: AgentExecutionState): Partial<AgentExecutionState> => {
    const thinkingLevel =
      state.options.thinkingLevel ?? (config.useThinking ? "high" : undefined);
    const useFast = thinkingLevel === "low";
    const activeModelId = useFast ? config.fastModelId : config.modelId;

    if (thinkingLevel) {
      const modelHint = useFast ? ` (using ${activeModelId})` : "";
      console.log(
        `[${config.id}] Thinking level: ${thinkingLevel}${modelHint}`,
      );
    }

    const trace = [...state.trace, "select_model"];
    return { thinkingLevel, useFast, activeModelId, trace };
  };
}

function makeResolveCacheNode(config: AgentExecutionGraphConfig) {
  return async (
    state: AgentExecutionState,
  ): Promise<Partial<AgentExecutionState>> => {
    try {
      const cacheKey = state.useFast ? `${config.id}:fast` : config.id;
      const cacheName = await getContextCache(
        cacheKey,
        state.activeModelId,
        state.staticPrompt,
        state.tools,
      );

      if (cacheName) {
        console.log(`[${config.id}] Using context cache: ${cacheName}`);
      }

      const stageId = cacheName ? "resolve_cache:hit" : "resolve_cache:miss";
      const trace = [...state.trace, stageId];
      return { cacheName, trace };
    } catch (error) {
      console.warn(`[${config.id}] Context cache unavailable, continuing`, {
        error,
      });
      const trace = [...state.trace, "resolve_cache:error"];
      return { cacheName: null, trace };
    }
  };
}

export function createAgentExecutionGraph(config: AgentExecutionGraphConfig) {
  const AgentExecutionAnnotation = Annotation.Root({
    options: Annotation<AgentExecutionOptions>(),
    tools: Annotation<ToolSet>(),
    staticPrompt: Annotation<string>(),
    dynamicContext: Annotation<string>(),
    thinkingLevel: Annotation<AgentThinkingLevel | undefined>(),
    useFast: Annotation<boolean>(),
    activeModelId: Annotation<string>(),
    cacheName: Annotation<string | null>(),
    trace: Annotation<string[]>(),
    result: Annotation<PreparedAgentRuntime | null>(),
  });

  return new StateGraph(AgentExecutionAnnotation)
    .addNode("prepare_context", makePrepareContextNode(config))
    .addNode("select_model", makeSelectModelNode(config))
    .addNode("resolve_cache", makeResolveCacheNode(config))
    .addNode("finalize_runtime", finalizeRuntimeNode)
    .addEdge(START, "prepare_context")
    .addEdge("prepare_context", "select_model")
    .addEdge("select_model", "resolve_cache")
    .addEdge("resolve_cache", "finalize_runtime")
    .addEdge("finalize_runtime", END)
    .compile();
}

export async function runAgentExecutionGraph(args: {
  graph: ReturnType<typeof createAgentExecutionGraph>;
  options: AgentExecutionOptions;
  messages?: ModelMessage[];
}): Promise<PreparedAgentRuntime> {
  const finalState = (await args.graph.invoke({
    options: args.options,
    tools: {},
    staticPrompt: "",
    dynamicContext: "",
    thinkingLevel: undefined,
    useFast: false,
    activeModelId: "",
    cacheName: null,
    trace: args.messages?.length
      ? [`messages:${args.messages.length}`]
      : ["messages:0"],
    result: null,
  })) as AgentExecutionState;

  if (!finalState.result) {
    throw new Error("[AgentExecutionGraph] Missing finalized runtime");
  }

  return finalState.result;
}
