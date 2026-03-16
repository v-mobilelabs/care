import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";
import { patientRepository } from "../repositories/patient.repository";
import {
  UpsertPatientSchema,
  type UpsertPatientInput,
  type PatientDto,
} from "../models/patient.model";

// ── Schema ────────────────────────────────────────────────────────────────────

const UpsertPatientUseCaseSchema = UpsertPatientSchema.extend({
  userId: z.string().min(1),
});

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Upserts the patient's health document in `patients/{userId}`.
 * Merges provided fields with existing document; does not delete omitted fields.
 *
 * Returns the full merged patient document.
 */
@Indexable({
  type: "patient",
  contentFields: [
    "sex",
    "height",
    "weight",
    "bloodGroup",
    "activityLevel",
    "foodPreferences",
    "waistCm",
    "hipCm",
    "neckCm",
  ],
  sourceIdField: "userId",
  sourceIdPrefix: "patient",
  metadataFields: ["updatedAt"],
})
export class UpsertPatientUseCase extends UseCase<
  UpsertPatientInput,
  PatientDto
> {
  static validate(input: unknown): UpsertPatientInput {
    return UpsertPatientUseCaseSchema.parse(input);
  }

  protected async run(input: UpsertPatientInput): Promise<PatientDto> {
    return patientRepository.upsert(input);
  }
}
