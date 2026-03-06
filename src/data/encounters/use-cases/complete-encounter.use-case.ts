import { encounterRepository } from "../repositories/encounter.repository";

export class CompleteEncounterUseCase {
  async execute(params: {
    requestId: string;
    durationSeconds?: number;
  }): Promise<void> {
    await encounterRepository.completeByRequestId(
      params.requestId,
      params.durationSeconds,
    );
  }
}
