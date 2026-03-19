import { meetRepository } from "../repositories/meet.repository";
import type { CallRequestDto } from "../models/meet.model";

export class GetActiveCallForPatientUseCase {
  async execute(params: { patientId: string }): Promise<CallRequestDto | null> {
    return meetRepository.getActiveForPatient(params.patientId);
  }
}
