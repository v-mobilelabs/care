import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildBloodTestPrompt } from "./prompt";
import { createFetchBloodTestsTool } from "./tools/fetch-blood-tests.tool";
import { createSubmitBloodTestAnalysisTool } from "./tools/submit-blood-test-analysis.tool";

/** Singleton — import this throughout the server-side application. */
export const bloodTestChatAgent = createAgent({
  id: "bloodTest",
  buildSystemPrompt: () => buildBloodTestPrompt(),
  buildTools: (options) => ({
    fetchBloodTests: createFetchBloodTestsTool(
      options.userId,
      options.profileId,
      options.dependentId,
    ),
    submitBloodTestAnalysis: createSubmitBloodTestAnalysisTool(),
  }),
});

/** Typed UIMessage for the blood test agent — use on client for typed tool parts. */
export type BloodTestAgentUIMessage = InferAgentUIMessage<
  typeof bloodTestChatAgent
>;
