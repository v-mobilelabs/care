import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import type { DoctorPatientDocument } from "../models/doctor-patient.model";

// ── Schema ────────────────────────────────────────────────────────────────────

export const GetDoctorPatientSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().min(1),
});

export type GetDoctorPatientInput = z.infer<typeof GetDoctorPatientSchema>;

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Retrieves the doctor-patient relationship document.
 * Returns null if no relationship exists.
 */
export class GetDoctorPatientUseCase extends UseCase<
  GetDoctorPatientInput,
  DoctorPatientDocument | null
> {
  static validate(input: unknown): GetDoctorPatientInput {
    return GetDoctorPatientSchema.parse(input);
  }

  protected async run(
    input: GetDoctorPatientInput,
  ): Promise<DoctorPatientDocument | null> {
    return doctorPatientRepository.get(input.doctorId, input.patientId);
  }
}
