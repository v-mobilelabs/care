import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { doctorPatientRepository } from "../repositories/doctor-patient.repository";
import type { PatientInviteDto } from "../models/doctor-patient.model";
import { db } from "@/lib/firebase/admin";

const ListPatientInvitesInputSchema = z.object({
  patientId: z.string().min(1),
});

export type ListPatientInvitesInput = z.infer<
  typeof ListPatientInvitesInputSchema
>;

interface DoctorProfileSnap {
  name?: string;
  photoUrl?: string;
  specialty?: string;
}

export class ListPatientInvitesUseCase extends UseCase<
  ListPatientInvitesInput,
  PatientInviteDto[]
> {
  static validate(input: unknown): ListPatientInvitesInput {
    return ListPatientInvitesInputSchema.parse(input);
  }

  protected async run(
    input: ListPatientInvitesInput,
  ): Promise<PatientInviteDto[]> {
    const docs = await doctorPatientRepository.listByPatient(input.patientId);
    if (docs.length === 0) return [];

    const doctorIds = [...new Set(docs.map((d) => d.doctorId))];

    // Fetch profile + doctor-profile docs in parallel
    const [profileSnaps, doctorSnaps] = await Promise.all([
      Promise.all(
        doctorIds.map((id) => db.collection("profiles").doc(id).get()),
      ),
      Promise.all(
        doctorIds.map((id) => db.collection("doctors").doc(id).get()),
      ),
    ]);

    const profileMap: Record<string, DoctorProfileSnap> = {};
    doctorIds.forEach((id, i) => {
      const profileData = profileSnaps[i].exists
        ? (profileSnaps[i].data() as { name?: string; photoUrl?: string })
        : null;
      const doctorData = doctorSnaps[i].exists
        ? (doctorSnaps[i].data() as { specialty?: string })
        : null;
      profileMap[id] = {
        name: profileData?.name,
        photoUrl: profileData?.photoUrl,
        specialty: doctorData?.specialty,
      };
    });

    return docs.map((doc) => ({
      doctorId: doc.doctorId,
      patientId: doc.patientId,
      status: doc.status,
      doctorName: profileMap[doc.doctorId]?.name,
      doctorPhotoUrl: profileMap[doc.doctorId]?.photoUrl,
      doctorSpecialty: profileMap[doc.doctorId]?.specialty,
      invitedAt: doc.invitedAt.toDate().toISOString(),
      updatedAt: doc.updatedAt.toDate().toISOString(),
    }));
  }
}
