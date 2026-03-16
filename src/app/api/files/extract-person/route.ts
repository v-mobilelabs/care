import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { google } from "@ai-sdk/google";
import { WithContext, ApiError } from "@/lib/api/with-context";

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

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/files/extract-person
 *
 * Accepts a multipart/form-data request with a `file` field.
 * Uses AI vision to detect whether the file contains personal details for a
 * named individual and returns their name/DOB if found.
 *
 * Does NOT consume a user credit — this is a background system check.
 */
export const POST = WithContext(async ({ req }) => {
  const formData = await req.formData().catch(() => null);
  if (!formData) throw ApiError.badRequest("Expected multipart/form-data.");

  const file = formData.get("file");
  if (!(file instanceof File))
    throw ApiError.badRequest("'file' field is required.");

  // Skip non-visual file types silently
  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return NextResponse.json<ExtractedPersonResult>({ hasPersonData: false });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const mediaPart = file.type.startsWith("image/")
    ? { type: "image" as const, image: dataUri }
    : {
        type: "file" as const,
        data: dataUri,
        mediaType: file.type as `${string}/${string}`,
      };

  try {
    // Use generateText directly — bypasses consumeCredit so no user credit is
    // charged for this background system check.
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

    const extracted = (result as unknown as { output?: ExtractedPersonResult })
      .output;
    if (!extracted)
      return NextResponse.json<ExtractedPersonResult>({ hasPersonData: false });
    return NextResponse.json<ExtractedPersonResult>(extracted);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.warn(
        "[extract-person] No structured output generated:",
        error.message,
      );
    }
    // Model error — don't block the send, just skip the check.
    return NextResponse.json<ExtractedPersonResult>({ hasPersonData: false });
  }
});
