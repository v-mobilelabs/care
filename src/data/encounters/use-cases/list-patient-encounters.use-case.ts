import { encounterRepository } from "../repositories/encounter.repository";
import type { EncounterDto } from "../models/encounter.model";

export class ListPatientEncountersUseCase {
  async execute(params: {
    doctorId: string;
    patientId: string;
    limit?: number;
  }): Promise<EncounterDto[]> {
    return encounterRepository.listByDoctorAndPatient(
      params.doctorId,
      params.patientId,
      params.limit,
    );
  }
}
