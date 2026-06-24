import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { meetRepository } from "../repositories/meet.repository";
import type { CallRequestDto } from "../models/meet.model";

// ── Schema ────────────────────────────────────────────────────────────────────

export const GetActiveMeetForDoctorSchema = z.object({
  doctorId: z.string().min(1),
});

export type GetActiveMeetForDoctorInput = z.infer<
  typeof GetActiveMeetForDoctorSchema
>;

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Retrieves the doctor's current active (accepted) call.
 * Returns null if the doctor has no active call.
 */
export class GetActiveMeetForDoctorUseCase extends UseCase<
  GetActiveMeetForDoctorInput,
  CallRequestDto | null
> {
  static validate(input: unknown): GetActiveMeetForDoctorInput {
    return GetActiveMeetForDoctorSchema.parse(input);
  }

  protected async run(
    input: GetActiveMeetForDoctorInput,
  ): Promise<CallRequestDto | null> {
    return meetRepository.getActiveForDoctor(input.doctorId);
  }
}
