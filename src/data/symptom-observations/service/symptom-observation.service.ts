import { Timestamp } from "firebase-admin/firestore";
import { symptomObservationRepository } from "../repositories/symptom-observation.repository";
import type {
  CreateSymptomObservationInput,
  DeleteSymptomObservationInput,
  ListSymptomObservationsInput,
  PaginatedSymptomObservations,
  SymptomObservationDto,
} from "../models/symptom-observation.model";
import {
  normalizeClinicalSymptomTerm,
  normalizeClinicalTermList,
} from "./clinical-symptom-normalizer";
import { normalizeClinicalTermsWithLlm } from "./llm-clinical-symptom-normalizer.service";

type ObservationNormalizationResult = {
  symptom: string;
  associatedSymptoms?: string[];
  triggers?: string[];
  alleviators?: string[];
};

async function normalizeObservationFieldsWithLlm(args: {
  userId: string;
  symptom: string;
  associatedSymptoms?: string[];
  triggers?: string[];
  alleviators?: string[];
}): Promise<ObservationNormalizationResult> {
  const associatedCount = args.associatedSymptoms?.length ?? 0;
  const triggerCount = args.triggers?.length ?? 0;
  const alleviatorCount = args.alleviators?.length ?? 0;

  const flatTerms = [
    args.symptom,
    ...(args.associatedSymptoms ?? []),
    ...(args.triggers ?? []),
    ...(args.alleviators ?? []),
  ];

  const normalized = await normalizeClinicalTermsWithLlm({
    userId: args.userId,
    terms: flatTerms,
  });

  const symptom =
    normalized.length > 0
      ? normalizeClinicalSymptomTerm(normalized[0] ?? args.symptom)
      : normalizeClinicalSymptomTerm(args.symptom);

  const associatedStart = 1;
  const associatedEnd = associatedStart + associatedCount;
  const triggerEnd = associatedEnd + triggerCount;
  const alleviatorEnd = triggerEnd + alleviatorCount;

  const associatedSymptoms = normalizeClinicalTermList(
    normalized.slice(associatedStart, associatedEnd),
  );
  const triggers = normalizeClinicalTermList(
    normalized.slice(associatedEnd, triggerEnd),
  );
  const alleviators = normalizeClinicalTermList(
    normalized.slice(triggerEnd, alleviatorEnd),
  );

  return {
    symptom,
    associatedSymptoms,
    triggers,
    alleviators,
  };
}

export class SymptomObservationService {
  async create(
    input: CreateSymptomObservationInput,
  ): Promise<SymptomObservationDto> {
    const {
      symptom,
      associatedSymptoms,
      triggers,
      alleviators,
    } = await normalizeObservationFieldsWithLlm({
      userId: input.userId,
      symptom: input.symptom,
      associatedSymptoms: input.associatedSymptoms,
      triggers: input.triggers,
      alleviators: input.alleviators,
    });

    return symptomObservationRepository.create(input.userId, {
      idempotencyKey: input.idempotencyKey,
      conditionId: input.conditionId,
      sessionId: input.sessionId,
      assessmentId: input.assessmentId,
      symptom,
      severity: input.severity,
      state: input.state,
      source: input.source,
      onset: input.onset,
      duration: input.duration,
      triggers,
      alleviators,
      associatedSymptoms,
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
