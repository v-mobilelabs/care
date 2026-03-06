import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import { ApiError } from "@/lib/api/with-context";

const AcceptInviteInputSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().min(1),
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteInputSchema>;

export class AcceptInviteUseCase extends UseCase<AcceptInviteInput, void> {
  static validate(input: unknown): AcceptInviteInput {
    return AcceptInviteInputSchema.parse(input);
  }

  protected async run(input: AcceptInviteInput): Promise<void> {
    const existing = await doctorPatientRepository.get(
      input.doctorId,
      input.patientId,
    );
    if (!existing) {
      throw ApiError.notFound("Invite not found.");
    }
    if (existing.status !== "pending") {
      throw ApiError.conflict("Invite is not in pending state.");
    }
    await doctorPatientRepository.updateStatus(
      input.doctorId,
      input.patientId,
      "accepted",
    );
  }
}
