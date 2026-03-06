import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import { ApiError } from "@/lib/api/with-context";

const DeclineInviteInputSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().min(1),
});

export type DeclineInviteInput = z.infer<typeof DeclineInviteInputSchema>;

export class DeclineInviteUseCase extends UseCase<DeclineInviteInput, void> {
  static validate(input: unknown): DeclineInviteInput {
    return DeclineInviteInputSchema.parse(input);
  }

  protected async run(input: DeclineInviteInput): Promise<void> {
    const existing = await doctorPatientRepository.get(
      input.doctorId,
      input.patientId,
    );
    if (!existing) {
      throw ApiError.notFound("Invite not found.");
    }
    if (existing.status === "revoked") {
      throw ApiError.conflict("Access is already revoked.");
    }
    // Decline a pending invite OR revoke an accepted connection — doctor can reinvite later
    await doctorPatientRepository.updateStatus(
      input.doctorId,
      input.patientId,
      "revoked",
    );
  }
}
