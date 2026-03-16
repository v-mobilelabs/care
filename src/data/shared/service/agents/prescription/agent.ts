import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildPrescriptionPrompt } from "./prompt";
import { createSubmitPrescriptionTool } from "./tools/submit-prescription.tool";
import { createFetchPrescriptionsTool } from "./tools/fetch-prescriptions.tool";

/** Singleton — import this throughout the server-side application. */
export const prescriptionChatAgent = createAgent({
  id: "prescription",
  buildSystemPrompt: () => buildPrescriptionPrompt(),
  buildTools: (options) => ({
    submitPrescription: createSubmitPrescriptionTool(
      options.userId,
      options.profileId,
      options.dependentId,
    ),
    fetchPrescriptions: createFetchPrescriptionsTool(
      options.userId,
      options.profileId,
      options.dependentId,
    ),
  }),
});

/** Typed UIMessage for the prescription agent — use on client for typed tool parts. */
export type PrescriptionAgentUIMessage = InferAgentUIMessage<
  typeof prescriptionChatAgent
>;
