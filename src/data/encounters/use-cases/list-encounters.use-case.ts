import { encounterRepository } from "../repositories/encounter.repository";
import type { EncounterDto } from "../models/encounter.model";

export class ListEncountersUseCase {
  async execute(params: {
    userId: string;
    kind: "patient" | "doctor";
    limit?: number;
  }): Promise<EncounterDto[]> {
    const { userId, kind, limit } = params;

    return kind === "doctor"
      ? encounterRepository.listByDoctor(userId, limit)
      : encounterRepository.listByPatient(userId, limit);
  }
}
