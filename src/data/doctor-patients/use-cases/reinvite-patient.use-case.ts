import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import {
  toDoctorPatientDto,
  type DoctorPatientDto,
} from "../models/doctor-patient.model";
import { ApiError } from "@/lib/api/with-context";
import { db } from "@/lib/firebase/admin";

const ReinvitePatientInputSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().min(1),
});

export type ReinvitePatientInput = z.infer<typeof ReinvitePatientInputSchema>;

export class ReinvitePatientUseCase extends UseCase<
  ReinvitePatientInput,
  DoctorPatientDto
> {
  static validate(input: unknown): ReinvitePatientInput {
    return ReinvitePatientInputSchema.parse(input);
  }

  protected async run(input: ReinvitePatientInput): Promise<DoctorPatientDto> {
    const existing = await doctorPatientRepository.get(
      input.doctorId,
      input.patientId,
    );
    if (!existing) {
      throw ApiError.notFound("Patient relationship not found.");
    }
    if (existing.status === "accepted") {
      throw ApiError.conflict(
        "Patient has already accepted. No reinvite needed.",
      );
    }

    const profileSnap = await db
      .collection("profiles")
      .doc(input.patientId)
      .get();
    const patientName = profileSnap.exists
      ? (profileSnap.data() as { name?: string }).name
      : existing.patientName;

    const doc = await doctorPatientRepository.invite({
      doctorId: input.doctorId,
      patientId: input.patientId,
      source: existing.source,
      patientName,
    });

    return toDoctorPatientDto(doc);
  }
}
