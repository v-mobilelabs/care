import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildLabReportPrompt } from "./prompt";
import { createFetchLabReportsTool } from "./tools/fetch-lab-reports.tool";
import { createSubmitLabReportAnalysisTool } from "./tools/submit-lab-report-analysis.tool";
import { askQuestionTool } from "@/data/shared/service/agents/global-tools/ask-question.tool";
import { logVitalTool } from "@/data/shared/service/agents/global-tools/log-vital.tool";
import { startAssessmentTool } from "@/data/shared/service/agents/global-tools/start-assessment.tool";

/** Singleton — import this throughout the server-side application. */
export const labReportChatAgent = createAgent({
  id: "labReport",
  buildSystemPrompt: () => buildLabReportPrompt(),
  temperature: 0.3,
  buildTools: (options) => ({
    fetchLabReports: createFetchLabReportsTool(
      options.userId,
      options.profileId,
    ),
    submitLabReportAnalysis: createSubmitLabReportAnalysisTool(),
    askQuestion: askQuestionTool,
    logVital: logVitalTool,
    startAssessment: startAssessmentTool,
  }),
});

/** Typed UIMessage for the lab report agent — use on client for typed tool parts. */
export type LabReportAgentUIMessage = InferAgentUIMessage<
  typeof labReportChatAgent
>;
