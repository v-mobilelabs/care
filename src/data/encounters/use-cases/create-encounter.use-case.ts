import { encounterRepository } from "../repositories/encounter.repository";
import type {
  EncounterDto,
  CreateEncounterInput,
} from "../models/encounter.model";

export class CreateEncounterUseCase {
  async execute(input: CreateEncounterInput): Promise<EncounterDto> {
    return encounterRepository.create(input);
  }
}
