import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildLabReportPrompt } from "./prompt";
import { createFetchLabReportsTool } from "./tools/fetch-lab-reports.tool";
import { createSubmitLabReportAnalysisTool } from "./tools/submit-lab-report-analysis.tool";

/** Singleton — import this throughout the server-side application. */
export const labReportChatAgent = createAgent({
  id: "labReport",
  buildSystemPrompt: () => buildLabReportPrompt(),
  buildTools: (options) => ({
    fetchLabReports: createFetchLabReportsTool(
      options.userId,
      options.profileId,
      options.dependentId,
    ),
    submitLabReportAnalysis: createSubmitLabReportAnalysisTool(),
  }),
});

/** Typed UIMessage for the lab report agent — use on client for typed tool parts. */
export type LabReportAgentUIMessage = InferAgentUIMessage<
  typeof labReportChatAgent
>;
