import { doctorProfileRepository } from "../repositories/doctor-profile.repository";
import {
  toDoctorProfileDto,
  type GetDoctorProfileInput,
  type RegisterDoctorInput,
  type UpdateAvailabilityInput,
  type DoctorProfileDto,
} from "../models/doctor-profile.model";

export class DoctorProfileService {
  async register(input: RegisterDoctorInput): Promise<DoctorProfileDto> {
    const exists = await doctorProfileRepository.exists(input.uid);
    const doctorDoc = exists
      ? await doctorProfileRepository.get(input.uid)
      : await doctorProfileRepository.create({
          uid: input.uid,
          specialty: input.specialty,
          licenseNumber: input.licenseNumber,
          bio: input.bio,
          availability: "unavailable",
        });
    return toDoctorProfileDto(doctorDoc!);
  }

  async getProfile(
    input: GetDoctorProfileInput,
  ): Promise<DoctorProfileDto | null> {
    const doctorDoc = await doctorProfileRepository
      .get(input.uid)
      .catch(() => null);
    if (!doctorDoc) return null;
    return toDoctorProfileDto(doctorDoc);
  }

  async updateAvailability(
    input: UpdateAvailabilityInput,
  ): Promise<DoctorProfileDto> {
    const doctorDoc = await doctorProfileRepository.updateAvailability(
      input.uid,
      input.availability,
    );
    return toDoctorProfileDto(doctorDoc);
  }
}

export const doctorProfileService = new DoctorProfileService();
