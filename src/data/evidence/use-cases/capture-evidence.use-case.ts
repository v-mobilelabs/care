import {
  CaptureEvidenceSchema,
  type CaptureEvidenceInput,
} from "../models/evidence.model";
import { evidenceRepository } from "../repositories/evidence.repository";

function sanitizeCaptureEvidenceInput(
  input: CaptureEvidenceInput,
): CaptureEvidenceInput {
  const sanitizedReasoning = (input.reasoning ?? [])
    .map((step, index) => {
      const description = step.description.trim();
      if (description.length < 5) return null;

      const normalizedStepNumber = Number.isInteger(step.stepNumber)
        ? Math.max(1, step.stepNumber)
        : index + 1;

      const normalizedReasoning = step.reasoning?.trim();
      const normalizedDataUsed = step.dataUsed?.filter((item) =>
        Boolean(item?.trim()),
      );

      return {
        ...step,
        stepNumber: normalizedStepNumber,
        description,
        ...(normalizedReasoning ? { reasoning: normalizedReasoning } : {}),
        ...(normalizedDataUsed && normalizedDataUsed.length > 0
          ? { dataUsed: normalizedDataUsed }
          : {}),
      };
    })
    .filter((step): step is NonNullable<typeof step> => step !== null);

  return {
    ...input,
    reasoning: sanitizedReasoning,
  };
}

export class CaptureEvidenceUseCase {
  async execute(
    profileId: string,
    input: CaptureEvidenceInput,
  ): Promise<{ ok: boolean }> {
    try {
      const sanitized = sanitizeCaptureEvidenceInput(input);
      const validated = CaptureEvidenceSchema.parse(sanitized);
      await evidenceRepository.capture(profileId, validated);
      return { ok: true };
    } catch (error) {
      console.error("[CaptureEvidenceUseCase] Evidence capture failed", {
        profileId,
        error,
      });
      return { ok: false };
    }
  }
}

export const captureEvidenceUseCase = new CaptureEvidenceUseCase();
