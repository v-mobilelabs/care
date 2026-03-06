import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import {
  toDoctorPatientDto,
  type DoctorPatientDto,
} from "../models/doctor-patient.model";
import { db } from "@/lib/firebase/admin";

const InvitePatientInputSchema = z.object({
  doctorId: z.string().min(1),
  patientId: z.string().min(1),
  source: z.enum(["search", "call"]).default("search"),
});

export type InvitePatientInput = z.infer<typeof InvitePatientInputSchema>;

export class InvitePatientUseCase extends UseCase<
  InvitePatientInput,
  DoctorPatientDto
> {
  static validate(input: unknown): InvitePatientInput {
    return InvitePatientInputSchema.parse(input);
  }

  protected async run(input: InvitePatientInput): Promise<DoctorPatientDto> {
    // Resolve patient name from profiles collection for display
    const profileSnap = await db
      .collection("profiles")
      .doc(input.patientId)
      .get();
    const patientName = profileSnap.exists
      ? (profileSnap.data() as { name?: string }).name
      : undefined;

    const doc = await doctorPatientRepository.invite({
      doctorId: input.doctorId,
      patientId: input.patientId,
      source: input.source,
      patientName,
    });

    return toDoctorPatientDto(doc);
  }
}
