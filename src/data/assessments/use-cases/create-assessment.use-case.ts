import {
  assessmentService,
  type AssessmentService,
} from "../service/assessment.service";
import {
  CreateAssessmentSchema,
  type CreateAssessmentInput,
  type AssessmentDto,
} from "../models/assessment.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateAssessmentUseCase extends UseCase<
  CreateAssessmentInput,
  AssessmentDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AssessmentService = assessmentService,
  ) {
    super();
  }

  static validate(input: unknown): CreateAssessmentInput {
    return CreateAssessmentSchema.parse(input);
  }

  protected async run(input: CreateAssessmentInput): Promise<AssessmentDto> {
    return this.service.upsertBySession(input, this.dependentId);
  }
}
