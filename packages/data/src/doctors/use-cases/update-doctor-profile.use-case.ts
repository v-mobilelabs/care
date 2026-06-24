import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { doctorProfileRepository } from "../repositories/doctor-profile.repository";
import {
  toDoctorProfileDto,
  UpdateDoctorSchema,
  type UpdateDoctorInput,
  type DoctorProfileDto,
} from "../models/doctor-profile.model";

export class UpdateDoctorProfileUseCase extends UseCase<
  UpdateDoctorInput & { uid: string },
  DoctorProfileDto
> {
  static validate(input: unknown): UpdateDoctorInput & { uid: string } {
    const { uid, ...rest } = input as Record<string, unknown>;
    const parsed = UpdateDoctorSchema.parse(rest);
    return { ...parsed, uid: String(uid) };
  }

  protected async run(
    input: UpdateDoctorInput & { uid: string },
  ): Promise<DoctorProfileDto> {
    await doctorProfileRepository.upsert({
      uid: input.uid,
      specialty: input.specialty,
      licenseNumber: input.licenseNumber,
      bio: input.bio,
    });

    const doc = await doctorProfileRepository.get(input.uid);
    if (!doc) throw new Error("Doctor profile not found after update.");
    return toDoctorProfileDto(doc);
  }
}
