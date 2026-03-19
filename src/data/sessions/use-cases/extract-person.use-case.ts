import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { google } from "@ai-sdk/google";

// ── Schema ────────────────────────────────────────────────────────────────────

const PersonSchema = z.object({
  hasPersonData: z
    .boolean()
    .describe(
      "Whether the document contains personal identification data about a specific named person",
    ),
  firstName: z
    .string()
    .optional()
    .describe("The person's first name if clearly identified in the document"),
  lastName: z
    .string()
    .optional()
    .describe("The person's last name if clearly identified in the document"),
  dateOfBirth: z
    .string()
    .optional()
    .describe(
      "The person's date of birth in ISO format YYYY-MM-DD if clearly identified",
    ),
});

export type ExtractedPersonResult = z.infer<typeof PersonSchema>;

const EXTRACTION_PROMPT = `Analyze this document or image.

If it contains personal identification information about a specific named person \
(such as a medical record, prescription, insurance card, ID card, health report, \
lab results, discharge summary, etc.), extract the patient/subject's name and \
date of birth.

Rules:
- Only set hasPersonData to true if you are highly confident the document is \
  about a specific named individual and their name is clearly visible.
- If multiple people are mentioned, focus on the primary patient or subject.
- If this is a general document, a generic photo, a chart, or has no identifiable \
  person, return hasPersonData: false.
- Do not guess or infer names — only return names that are explicitly written.`;

const NO_PERSON: ExtractedPersonResult = { hasPersonData: false };

// ── UseCase ───────────────────────────────────────────────────────────────────

/**
 * Extracts person identification data from a file using AI vision.
 *
 * Does NOT consume a user credit — this is a background system check.
 * Uses the model directly (bypasses aiService credit gating).
 */
export class ExtractPersonUseCase {
  async execute(input: {
    mimeType: string;
    base64: string;
  }): Promise<ExtractedPersonResult> {
    const dataUri = `data:${input.mimeType};base64,${input.base64}`;

    const mediaPart = input.mimeType.startsWith("image/")
      ? { type: "image" as const, image: dataUri }
      : {
          type: "file" as const,
          data: dataUri,
          mediaType: input.mimeType as `${string}/${string}`,
        };

    try {
      const result = await generateText({
        model: google("gemini-2.5-flash"),
        output: Output.object({ schema: PersonSchema }),
        messages: [
          {
            role: "user",
            content: [
              mediaPart,
              { type: "text" as const, text: EXTRACTION_PROMPT },
            ],
          },
        ],
      });

      const extracted = (
        result as unknown as { output?: ExtractedPersonResult }
      ).output;
      return extracted ?? NO_PERSON;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.warn(
          "[extract-person] No structured output generated:",
          (error as Error).message,
        );
      }
      // Model error — don't block the send, just skip the check.
      return NO_PERSON;
    }
  }
}
