import { Timestamp } from "firebase-admin/firestore";
import { symptomObservationRepository } from "../repositories/symptom-observation.repository";
import type {
  CreateSymptomObservationInput,
  DeleteSymptomObservationInput,
  ListSymptomObservationsInput,
  PaginatedSymptomObservations,
  SymptomObservationDto,
} from "../models/symptom-observation.model";
import { normalizeClinicalTermsWithLlm } from "./llm-clinical-symptom-normalizer.service";
import { parseStructuredSymptomFromText } from "./llm-structured-symptom-parser.service";

type ObservationNormalizationResult = {
  symptom: string;
  severity?: number;
  state?: "improving" | "stable" | "worsening";
  onset?: string;
  duration?: string;
  notes?: string;
  associatedSymptoms?: string[];
  triggers?: string[];
  alleviators?: string[];
};

function hasAnyStructuredFields(input: CreateSymptomObservationInput): boolean {
  return Boolean(
    input.severity !== undefined ||
    input.state ||
    input.onset ||
    input.duration ||
    input.notes ||
    (input.triggers && input.triggers.length > 0) ||
    (input.alleviators && input.alleviators.length > 0) ||
    (input.associatedSymptoms && input.associatedSymptoms.length > 0),
  );
}

function dedupeTerms(values: string[]): string[] | undefined {
  if (values.length === 0) return undefined;

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(cleaned);
  }

  return deduped.length > 0 ? deduped : undefined;
}

async function normalizeObservationFieldsWithLlm(args: {
  userId: string;
  symptom: string;
  severity?: number;
  state?: "improving" | "stable" | "worsening";
  onset?: string;
  duration?: string;
  notes?: string;
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

  const symptom = normalized[0]?.trim();
  if (!symptom) {
    throw new Error(
      "LLM symptom normalization returned an empty primary symptom.",
    );
  }

  const associatedStart = 1;
  const associatedEnd = associatedStart + associatedCount;
  const triggerEnd = associatedEnd + triggerCount;
  const alleviatorEnd = triggerEnd + alleviatorCount;

  const associatedSymptoms = dedupeTerms(
    normalized.slice(associatedStart, associatedEnd),
  );
  const triggers = dedupeTerms(normalized.slice(associatedEnd, triggerEnd));
  const alleviators = dedupeTerms(normalized.slice(triggerEnd, alleviatorEnd));

  return {
    symptom,
    ...(args.severity === undefined ? {} : { severity: args.severity }),
    ...(args.state ? { state: args.state } : {}),
    ...(args.onset ? { onset: args.onset } : {}),
    ...(args.duration ? { duration: args.duration } : {}),
    ...(args.notes ? { notes: args.notes } : {}),
    associatedSymptoms,
    triggers,
    alleviators,
  };
}

export class SymptomObservationService {
  async create(
    input: CreateSymptomObservationInput,
  ): Promise<SymptomObservationDto> {
    const shouldParseSimpleManualInput =
      input.source === "manual" && !hasAnyStructuredFields(input);

    const extractedFromFreeText = shouldParseSimpleManualInput
      ? await parseStructuredSymptomFromText({
          userId: input.userId,
          freeTextInput: input.symptom,
        })
      : null;

    const normalizedInput = {
      symptom: extractedFromFreeText?.symptom ?? input.symptom,
      severity: extractedFromFreeText?.severity ?? input.severity,
      state: extractedFromFreeText?.state ?? input.state,
      onset: extractedFromFreeText?.onset ?? input.onset,
      duration: extractedFromFreeText?.duration ?? input.duration,
      notes: extractedFromFreeText?.notes ?? input.notes,
      associatedSymptoms:
        extractedFromFreeText?.associatedSymptoms ?? input.associatedSymptoms,
      triggers: extractedFromFreeText?.triggers ?? input.triggers,
      alleviators: extractedFromFreeText?.alleviators ?? input.alleviators,
    };

    const {
      symptom,
      severity,
      state,
      onset,
      duration,
      notes,
      associatedSymptoms,
      triggers,
      alleviators,
    } = await normalizeObservationFieldsWithLlm({
      userId: input.userId,
      symptom: normalizedInput.symptom,
      severity: normalizedInput.severity,
      state: normalizedInput.state,
      onset: normalizedInput.onset,
      duration: normalizedInput.duration,
      notes: normalizedInput.notes,
      associatedSymptoms: normalizedInput.associatedSymptoms,
      triggers: normalizedInput.triggers,
      alleviators: normalizedInput.alleviators,
    });

    return symptomObservationRepository.create(input.userId, {
      idempotencyKey: input.idempotencyKey,
      conditionId: input.conditionId,
      sessionId: input.sessionId,
      assessmentId: input.assessmentId,
      symptom,
      severity,
      state,
      source: input.source,
      onset,
      duration,
      triggers,
      alleviators,
      associatedSymptoms,
      notes,
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
