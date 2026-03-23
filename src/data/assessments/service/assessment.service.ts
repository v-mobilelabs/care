import { assessmentRepository } from "../repositories/assessment.repository";
import { Timestamp } from "firebase-admin/firestore";
import type {
  CreateAssessmentInput,
  ListAssessmentsInput,
  AssessmentRefInput,
  AssessmentDto,
  QaPair,
} from "../models/assessment.model";

function dedupeQa(qa: QaPair[]): QaPair[] {
  const seen = new Set<string>();
  const out: QaPair[] = [];
  for (const pair of qa) {
    const key = JSON.stringify({
      q: pair.question,
      t: pair.questionType,
      o: pair.options ?? [],
      a: pair.answer,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  return out;
}

function toTimestamp(iso?: string): Timestamp | undefined {
  if (!iso) return undefined;
  return Timestamp.fromDate(new Date(iso));
}

function mapAssessmentBase(input: CreateAssessmentInput) {
  return {
    title: input.title,
    condition: input.condition,
    guideline: input.guideline,
    estimatedQuestions: input.estimatedQuestions,
    estimatedMinutes: input.estimatedMinutes,
    status: input.status,
    startedAt: toTimestamp(input.startedAt),
    completedAt: toTimestamp(input.completedAt),
    riskLevel: input.riskLevel,
    summary: input.summary,
  };
}

async function findExistingAssessment(
  input: CreateAssessmentInput,
  dependentId?: string,
) {
  if (input.runId) {
    return assessmentRepository.findBySessionAndRunId(
      input.userId,
      input.sessionId,
      input.runId,
      dependentId,
    );
  }

  return assessmentRepository.findLatestBySession(
    input.userId,
    input.sessionId,
    dependentId,
  );
}

async function createAssessment(
  input: CreateAssessmentInput,
  dependentId?: string,
): Promise<AssessmentDto> {
  return assessmentRepository.create(
    input.userId,
    {
      sessionId: input.sessionId,
      runId: input.runId,
      ...mapAssessmentBase(input),
      qa: dedupeQa(input.qa ?? []),
    },
    dependentId,
  );
}

async function updateAssessment(
  existing: AssessmentDto,
  input: CreateAssessmentInput,
  dependentId?: string,
): Promise<AssessmentDto> {
  return assessmentRepository.update(
    input.userId,
    existing.id,
    {
      ...mapAssessmentBase(input),
      qa: dedupeQa([...(existing.qa ?? []), ...(input.qa ?? [])]),
    },
    dependentId,
  );
}

export class AssessmentService {
  /**
   * Upsert by run/session:
   * - If runId is provided, update/create that specific assessment run.
   * - If runId is absent, update the latest assessment in the session.
   *
   * Q&A is appended incrementally (de-duplicated) instead of being overwritten.
   */
  async upsertBySessionRun(
    input: CreateAssessmentInput,
    dependentId?: string,
  ): Promise<AssessmentDto> {
    const existing = await findExistingAssessment(input, dependentId);

    if (existing) {
      return updateAssessment(existing, input, dependentId);
    }

    return createAssessment(input, dependentId);
  }

  async getById(
    input: AssessmentRefInput,
    dependentId?: string,
  ): Promise<AssessmentDto | null> {
    return assessmentRepository.findById(
      input.userId,
      input.assessmentId,
      dependentId,
    );
  }

  async list(
    input: ListAssessmentsInput,
    dependentId?: string,
  ): Promise<AssessmentDto[]> {
    return assessmentRepository.list(input.userId, input.limit, dependentId);
  }

  async delete(input: AssessmentRefInput, dependentId?: string): Promise<void> {
    await assessmentRepository.delete(
      input.userId,
      input.assessmentId,
      dependentId,
    );
  }
}

export const assessmentService = new AssessmentService();
