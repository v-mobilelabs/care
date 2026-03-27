import { conditionRepository } from "../repositories/condition.repository";
import { CreateSymptomObservationUseCase } from "@/data/symptom-observations";
import type {
  CreateConditionInput,
  ListConditionsInput,
  DeleteConditionInput,
  ConditionDto,
} from "../models/condition.model";

function normalizeConditionSymptoms(symptoms?: string[]): string[] | undefined {
  if (!symptoms || symptoms.length === 0) return undefined;

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of symptoms) {
    const cleaned = raw.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(cleaned);
    if (normalized.length >= 12) break;
  }

  return normalized.length > 0 ? normalized : undefined;
}

export class ConditionService {
  async create(input: CreateConditionInput): Promise<ConditionDto> {
    const symptoms = normalizeConditionSymptoms(input.symptoms);

    const created = await conditionRepository.create(input.userId, {
      sessionId: input.sessionId,
      name: input.name,
      icd10: input.icd10,
      severity: input.severity,
      status: input.status,
      description: input.description,
      symptoms,
    });

    if (symptoms && symptoms.length > 0) {
      try {
        await Promise.all(
          symptoms.map(async (symptom) =>
            new CreateSymptomObservationUseCase().execute({
              userId: input.userId,
              conditionId: created.id,
              sessionId: input.sessionId,
              symptom,
              notes: input.description,
              source: "manual",
              idempotencyKey: `condition:${created.id}:${symptom.toLowerCase()}`,
            }),
          ),
        );
      } catch (error) {
        console.warn(
          "[ConditionService] Failed to mirror condition symptoms to timeline",
          error,
        );
      }
    }

    return created;
  }

  async list(input: ListConditionsInput): Promise<ConditionDto[]> {
    return conditionRepository.list(input.userId, input.limit);
  }

  async delete(input: DeleteConditionInput): Promise<void> {
    await conditionRepository.delete(input.userId, input.conditionId);
  }
}

export const conditionService = new ConditionService();
