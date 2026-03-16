import { generateObject } from "ai";
import { z } from "zod";
import { aiService } from "@/data/shared/service/ai.service";
import { FILE_LABELS } from "../models/file.model";
import { fileRepository } from "../repositories/file.repository";

// ── Schema ────────────────────────────────────────────────────────────────────

const ClassifyFileInputSchema = z.object({
  fileId: z.string().min(1),
  profileId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  buffer: z.instanceof(Buffer),
});

export type ClassifyFileInput = z.infer<typeof ClassifyFileInputSchema>;

const ResultSchema = z.object({
  label: z
    .enum(FILE_LABELS)
    .describe("The medical document category that best matches this file."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score between 0 and 1."),
});

// ── Use Case ──────────────────────────────────────────────────────────────────

/**
 * Classifies an uploaded medical file using Gemini Flash and writes the
 * resulting label back to Firestore. Designed to be called fire-and-forget
 * from FileService.upload — the upload response is never delayed by this.
 *
 * Supported labels: xray | blood_test | prescription | scan | report | vaccination | other
 */
export class ClassifyFileUseCase {
  static validate(input: unknown): ClassifyFileInput {
    return ClassifyFileInputSchema.parse(input);
  }

  async execute(input: ClassifyFileInput): Promise<void> {
    const isMultimodal =
      input.mimeType.startsWith("image/") ||
      input.mimeType === "application/pdf";

    // Build base64 data URI (matches prescription-extraction.service.ts pattern)
    const base64 = input.buffer.toString("base64");
    const dataUri = `data:${input.mimeType};base64,${base64}`;

    const mediaPart = input.mimeType.startsWith("image/")
      ? { type: "image" as const, image: dataUri }
      : {
          type: "file" as const,
          data: dataUri,
          mediaType: input.mimeType as `${string}/${string}`,
        };

    const { object } = await generateObject({
      model: aiService.forUser(input.userId).fast,
      schema: ResultSchema,
      system:
        `You are a medical document classifier. Classify the file into exactly one of these categories: ` +
        `xray, blood_test, prescription, scan, report, vaccination, other. ` +
        `Filename: "${input.name}".`,
      messages: [
        {
          role: "user",
          content: isMultimodal
            ? [mediaPart]
            : `Classify this medical document. ` +
              `Categories: xray, blood_test, prescription, scan, report, vaccination, other. ` +
              `Filename: "${input.name}". MIME type: ${input.mimeType}.`,
        },
      ],
    });

    await fileRepository.patch(input.profileId, input.fileId, {
      label: object.label,
      labelConfidence: object.confidence,
    });
  }
}
