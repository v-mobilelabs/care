import { doctorRepository } from "../repositories/doctor.repository";
import type {
  CreateDoctorInput,
  ListDoctorsInput,
  DeleteDoctorInput,
  DoctorDto,
} from "../models/doctor.model";

export class DoctorService {
  async create(input: CreateDoctorInput): Promise<DoctorDto> {
    return doctorRepository.create(input.userId, {
      name: input.name,
      specialty: input.specialty,
      address: input.address,
      clinic: input.clinic,
      notes: input.notes,
    });
  }

  async list(input: ListDoctorsInput): Promise<DoctorDto[]> {
    return doctorRepository.list(input.userId, input.limit);
  }

  async delete(input: DeleteDoctorInput): Promise<void> {
    await doctorRepository.delete(input.userId, input.doctorId);
  }
}

export const doctorService = new DoctorService();
