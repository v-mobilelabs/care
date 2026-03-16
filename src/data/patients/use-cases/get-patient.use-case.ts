import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { patientRepository } from "../repositories/patient.repository";
import type { PatientDto } from "../models/patient.model";

// ── Schema ────────────────────────────────────────────────────────────────────

export const GetPatientSchema = z.object({
  userId: z.string().min(1),
});

export type GetPatientInput = z.infer<typeof GetPatientSchema>;

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Retrieves serialized patient health data from patients/{userId}.
 * Returns null if no patient document exists.
 */
export class GetPatientUseCase extends UseCase<
  GetPatientInput,
  PatientDto | null
> {
  static validate(input: unknown): GetPatientInput {
    return GetPatientSchema.parse(input);
  }

  protected async run(input: GetPatientInput): Promise<PatientDto | null> {
    return patientRepository.get(input.userId);
  }
}
