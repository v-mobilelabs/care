import { patientRepository } from "../repositories/patient.repository";
import type {
  UpsertPatientInput,
  PatientDto,
} from "../models/patient.model";

export class PatientService {
  async get(userId: string): Promise<PatientDto | null> {
    return patientRepository.get(userId);
  }

  async upsert(input: UpsertPatientInput): Promise<PatientDto> {
    return patientRepository.upsert(input);
  }

  async withdrawConsent(userId: string): Promise<void> {
    await patientRepository.withdrawConsent(userId);
  }
}

export const patientService = new PatientService();
