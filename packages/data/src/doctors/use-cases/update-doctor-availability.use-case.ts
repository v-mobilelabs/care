import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { doctorProfileRepository } from "../repositories/doctor-profile.repository";
import type {
  DoctorProfileDocument,
  AvailabilityStatus,
} from "../models/doctor-profile.model";

// ── Schema ────────────────────────────────────────────────────────────────────

export const UpdateDoctorAvailabilitySchema = z.object({
  uid: z.string().min(1),
  availability: z.enum(["available", "busy", "unavailable"]),
});

export type UpdateDoctorAvailabilityInput = z.infer<
  typeof UpdateDoctorAvailabilitySchema
>;

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Updates a doctor's availability status.
 * Used by the presence system to mirror online/offline state to Firestore.
 */
export class UpdateDoctorAvailabilityUseCase extends UseCase<
  UpdateDoctorAvailabilityInput,
  DoctorProfileDocument
> {
  static validate(input: unknown): UpdateDoctorAvailabilityInput {
    return UpdateDoctorAvailabilitySchema.parse(input);
  }

  protected async run(
    input: UpdateDoctorAvailabilityInput,
  ): Promise<DoctorProfileDocument> {
    return doctorProfileRepository.updateAvailability(
      input.uid,
      input.availability as AvailabilityStatus,
    );
  }
}
