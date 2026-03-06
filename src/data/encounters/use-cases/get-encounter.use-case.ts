import { encounterRepository } from "../repositories/encounter.repository";
import type { EncounterDto } from "../models/encounter.model";
import { ApiError } from "@/lib/api/with-context";

export class GetEncounterUseCase {
  async execute(params: {
    encounterId: string;
    userId: string;
  }): Promise<EncounterDto> {
    const { encounterId, userId } = params;

    const encounter = await encounterRepository.get(encounterId);
    if (!encounter) throw ApiError.notFound("Encounter not found.");

    // Only the doctor or patient involved may view this encounter
    if (encounter.doctorId !== userId && encounter.patientId !== userId) {
      throw ApiError.forbidden("You are not part of this encounter.");
    }

    return encounter;
  }
}
