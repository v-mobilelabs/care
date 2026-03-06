import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import { ApiError } from "@/lib/api/with-context";

const RevokePatientInputSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().min(1),
});

export type RevokePatientInput = z.infer<typeof RevokePatientInputSchema>;

export class RevokePatientUseCase extends UseCase<RevokePatientInput, void> {
  static validate(input: unknown): RevokePatientInput {
    return RevokePatientInputSchema.parse(input);
  }

  protected async run(input: RevokePatientInput): Promise<void> {
    const existing = await doctorPatientRepository.get(
      input.doctorId,
      input.patientId,
    );
    if (!existing) {
      throw ApiError.notFound("Patient relationship not found.");
    }
    await doctorPatientRepository.updateStatus(
      input.doctorId,
      input.patientId,
      "revoked",
    );
  }
}
