import { encounterRepository } from "../repositories/encounter.repository";
import { ApiError } from "@/lib/api/with-context";

export class UpdateEncounterNotesUseCase {
  async execute(params: {
    encounterId: string;
    doctorId: string;
    notes: string;
  }): Promise<void> {
    const { encounterId, doctorId, notes } = params;

    const encounter = await encounterRepository.get(encounterId);
    if (!encounter) throw ApiError.notFound("Encounter not found.");

    // Only the doctor on this encounter may update notes
    if (encounter.doctorId !== doctorId) {
      throw ApiError.forbidden("Only the encounter's doctor can update notes.");
    }

    await encounterRepository.updateNotes(encounterId, notes);
  }
}
