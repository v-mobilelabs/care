/**
 * Clinical Agent — Prompt
 *
 * Provides the static system prompt for the Clinical Expert Agent.
 * The prompt itself comes from the PromptRepository (clinical-system),
 * which stores the full CareAI clinical persona.
 *
 * Per-request context (attachment presence, patient data) is
 * handled by RAG — never injected directly into the prompt.
 */

import { promptService } from "@/data/prompts/service/prompt.service";

/** Returns the static clinical system prompt from the prompt repository. */
export function buildClinicalPrompt(): string {
  const prompt = promptService.get({ id: "clinical-system" });
  if (!prompt) {
    throw new Error(
      "[ClinicalAgent] 'clinical-system' prompt not found in repository.",
    );
  }
  return prompt.content;
}

// ── Attachment context ────────────────────────────────────────────────────────

const ATTACHMENT_PRESENT =
  "\n## CURRENT MESSAGE CONTEXT\n" +
  "The user's current message DOES contain an attached file or image. " +
  "You may analyse it following the report/image analysis protocol.";

const ATTACHMENT_ABSENT =
  "\n## CURRENT MESSAGE CONTEXT\n" +
  "⚠️ The user's current message does NOT contain any attached file or image. " +
  "Do NOT describe, interpret, or analyse any image or report. If the user mentions " +
  "a file or X-ray, call `askQuestion` to ask them to upload it.";

/** Returns the per-request attachment context note to append after the static prompt. */
export function buildAttachmentContext(hasAttachment: boolean): string {
  return hasAttachment ? ATTACHMENT_PRESENT : ATTACHMENT_ABSENT;
}
