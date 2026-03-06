import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import {
  toDoctorPatientDto,
  type DoctorPatientDto,
  type DoctorPatientStatus,
} from "../models/doctor-patient.model";
import { db } from "@/lib/firebase/admin";

const ListDoctorPatientsInputSchema = z.object({
  doctorId: z.string().min(1),
  status: z.enum(["pending", "accepted", "revoked"]).optional(),
});

export type ListDoctorPatientsInput = z.infer<
  typeof ListDoctorPatientsInputSchema
>;

export class ListDoctorPatientsUseCase extends UseCase<
  ListDoctorPatientsInput,
  DoctorPatientDto[]
> {
  static validate(input: unknown): ListDoctorPatientsInput {
    return ListDoctorPatientsInputSchema.parse(input);
  }

  protected async run(
    input: ListDoctorPatientsInput,
  ): Promise<DoctorPatientDto[]> {
    const docs = await doctorPatientRepository.listByDoctor(
      input.doctorId,
      input.status as DoctorPatientStatus | undefined,
    );

    if (docs.length === 0) return [];

    // Batch-fetch patient profiles for name/photo enrichment
    const profileSnaps = await Promise.all(
      docs.map((d) => db.collection("profiles").doc(d.patientId).get()),
    );

    return docs.map((doc, i) => {
      const profileData = profileSnaps[i].exists
        ? (profileSnaps[i].data() as {
            name?: string;
            photoUrl?: string;
            email?: string;
          })
        : null;
      return toDoctorPatientDto(doc, {
        patientPhotoUrl: profileData?.photoUrl,
        patientEmail: profileData?.email,
      });
    });
  }
}
