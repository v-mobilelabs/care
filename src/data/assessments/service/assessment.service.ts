import { assessmentRepository } from "../repositories/assessment.repository";
import type {
  CreateAssessmentInput,
  ListAssessmentsInput,
  AssessmentRefInput,
  AssessmentDto,
} from "../models/assessment.model";

export class AssessmentService {
  /**
   * Upsert: if an assessment already exists for this session, update it
   * in-place (preserving the original createdAt). Otherwise create a new one.
   * This ensures each session has exactly one assessment record.
   */
  async upsertBySession(
    input: CreateAssessmentInput,
    dependentId?: string,
  ): Promise<AssessmentDto> {
    const existing = await assessmentRepository.findBySession(
      input.userId,
      input.sessionId,
      dependentId,
    );
    if (existing) {
      return assessmentRepository.update(
        input.userId,
        existing.id,
        {
          title: input.title,
          condition: input.condition,
          riskLevel: input.riskLevel,
          summary: input.summary,
          qa: input.qa,
        },
        dependentId,
      );
    }
    return assessmentRepository.create(
      input.userId,
      {
        sessionId: input.sessionId,
        title: input.title,
        condition: input.condition,
        riskLevel: input.riskLevel,
        summary: input.summary,
        qa: input.qa,
      },
      dependentId,
    );
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
