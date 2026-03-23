/**
 * ValidateFileContentService — AI-powered content guardrail for uploaded files.
 *
 * Before running expensive extraction (prescription, lab report), this service
 * performs a cheap LLM classification (~100ms, no credit consumed) to verify
 * the file actually contains the expected document type. Rejects selfies,
 * random photos, non-medical documents, etc. before they waste a credit.
 */

import { aiService, type AIService } from "@/data/shared/service/ai.service";
import { FileValidationError } from "@/lib/errors";

/** Document types that can be validated. */
export type ValidatableFileType =
  | "prescription"
  | "lab_report"
  | "xray"
  | "scan";

const CLASSIFICATION_SYSTEM_PROMPT: Record<ValidatableFileType, string> = {
  prescription: `You are a medical document classifier. Determine whether this file is a medical prescription.
A valid prescription typically contains: medication names, dosage instructions, a prescribing doctor's name or stamp, and/or a pharmacy header.
Classify as "yes" if it IS a prescription, or "no" if it is NOT (e.g. a selfie, random photo, receipt, non-medical document).`,

  lab_report: `You are a medical document classifier. Determine whether this file is a lab report or blood test result.
A valid lab report typically contains: biomarker/test names, measured values with units, reference ranges, a laboratory name or header, and/or a patient identifier.
Classify as "yes" if it IS a lab/blood test report, or "no" if it is NOT (e.g. a selfie, random photo, receipt, non-medical document).`,

  xray: `You are a medical document classifier. Determine whether this file is a medical X-ray or radiological image.
A valid X-ray or radiology image typically shows: internal body structures (bones, lungs, etc.), radiographic markers, patient identifiers, or a DICOM-style header.
Classify as "yes" if it IS an X-ray or radiological image, or "no" if it is NOT (e.g. a selfie, random photo, receipt, non-medical document).`,

  scan: `You are a medical document classifier. Determine whether this file is a medical scan (MRI, CT, ultrasound, etc.).
A valid medical scan typically shows: cross-sectional body images, scan metadata, patient identifiers, or DICOM headers.
Classify as "yes" if it IS a medical scan, or "no" if it is NOT (e.g. a selfie, random photo, receipt, non-medical document).`,
};

const HUMAN_READABLE: Record<ValidatableFileType, string> = {
  prescription: "prescription",
  lab_report: "lab report or blood test",
  xray: "X-ray",
  scan: "medical scan",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMediaPart(mimeType: string, buffer: Buffer) {
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  return mimeType.startsWith("image/")
    ? { type: "image" as const, image: dataUri }
    : {
        type: "file" as const,
        data: dataUri,
        mediaType: mimeType as `${string}/${string}`,
      };
}

async function classify(
  ai: AIService,
  userId: string,
  mediaPart: ReturnType<typeof buildMediaPart>,
  expectedType: ValidatableFileType,
): Promise<"yes" | "no" | null> {
  return ai
    .extractChoice(
      ["yes", "no"] as const,
      [
        { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT[expectedType] },
        { role: "user", content: [mediaPart] },
      ],
      { userId, useLite: true, skipCredit: true },
    )
    .catch((err: unknown) => {
      console.error(
        `[ValidateFileContent] Classification failed for ${expectedType}:`,
        err,
      );
      return null; // graceful degradation
    });
}

function rejectFile(expectedType: ValidatableFileType): never {
  const label = HUMAN_READABLE[expectedType];
  console.warn(
    `[ValidateFileContent] Rejected file — expected ${expectedType}`,
  );
  throw new FileValidationError(
    expectedType,
    `The uploaded file does not appear to be a valid ${label}. Please upload a clear photo or document of your ${label}.`,
  );
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ValidateFileContentService {
  constructor(private readonly ai: AIService = aiService) {}

  async assertType(
    userId: string,
    mimeType: string,
    buffer: Buffer,
    expectedType: ValidatableFileType,
  ): Promise<void> {
    const answer = await classify(
      this.ai,
      userId,
      buildMediaPart(mimeType, buffer),
      expectedType,
    );
    if (answer === "no") rejectFile(expectedType);
  }
}

/** Singleton — import throughout the server-side application. */
export const validateFileContentService = new ValidateFileContentService();
