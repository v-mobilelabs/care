import { Timestamp } from "firebase-admin/firestore";
import { symptomObservationRepository } from "../repositories/symptom-observation.repository";
import type {
  CreateSymptomObservationInput,
  DeleteSymptomObservationInput,
  ListSymptomObservationsInput,
  PaginatedSymptomObservations,
  SymptomObservationDto,
} from "../models/symptom-observation.model";

export class SymptomObservationService {
  async create(
    input: CreateSymptomObservationInput,
  ): Promise<SymptomObservationDto> {
    return symptomObservationRepository.create(input.userId, {
      idempotencyKey: input.idempotencyKey,
      conditionId: input.conditionId,
      sessionId: input.sessionId,
      assessmentId: input.assessmentId,
      symptom: input.symptom,
      severity: input.severity,
      state: input.state,
      source: input.source,
      onset: input.onset,
      duration: input.duration,
      triggers: input.triggers,
      alleviators: input.alleviators,
      associatedSymptoms: input.associatedSymptoms,
      notes: input.notes,
      observedAt: input.observedAt
        ? Timestamp.fromDate(new Date(input.observedAt))
        : Timestamp.now(),
    });
  }

  async listPaginated(
    input: ListSymptomObservationsInput,
  ): Promise<PaginatedSymptomObservations> {
    return symptomObservationRepository.listPaginated(input.userId, input);
  }

  async delete(input: DeleteSymptomObservationInput): Promise<void> {
    await symptomObservationRepository.delete(
      input.userId,
      input.observationId,
    );
  }
}

export const symptomObservationService = new SymptomObservationService();
