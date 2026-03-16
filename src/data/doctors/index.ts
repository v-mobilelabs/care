// ── Patient-saved doctor contacts ─────────────────────────────────────────────
export * from "./models/doctor.model";
export { doctorRepository } from "./repositories/doctor.repository";
export { doctorService, DoctorService } from "./service/doctor.service";
export { CreateDoctorUseCase } from "./use-cases/create-doctor.use-case";
export { ListDoctorsUseCase } from "./use-cases/list-doctors.use-case";
export { DeleteDoctorUseCase } from "./use-cases/delete-doctor.use-case";

// ── Doctor portal / professional profile ──────────────────────────────────────
export { RegisterDoctorUseCase } from "./use-cases/register-doctor.use-case";
export { GetDoctorProfileUseCase } from "./use-cases/get-doctor-profile.use-case";
export { UpdateDoctorAvailabilityUseCase } from "./use-cases/update-doctor-availability.use-case";
export type { UpdateDoctorAvailabilityInput } from "./use-cases/update-doctor-availability.use-case";
export { doctorProfileRepository } from "./repositories/doctor-profile.repository";
export type {
  DoctorProfileDto,
  AvailabilityStatus,
  RegisterDoctorInput,
  GetDoctorProfileInput,
  UpdateDoctorInput,
} from "./models/doctor-profile.model";
export { UpdateDoctorSchema } from "./models/doctor-profile.model";
