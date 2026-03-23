import {
  assessmentService,
  type AssessmentService,
} from "../service/assessment.service";
import {
  ListAssessmentsSchema,
  type ListAssessmentsInput,
  type PaginatedAssessments,
} from "../models/assessment.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListAssessmentsUseCase extends UseCase<
  ListAssessmentsInput,
  PaginatedAssessments
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AssessmentService = assessmentService,
  ) {
    super();
  }

  static validate(input: unknown): ListAssessmentsInput {
    return ListAssessmentsSchema.parse(input);
  }

  protected async run(
    input: ListAssessmentsInput,
  ): Promise<PaginatedAssessments> {
    return this.service.list(input, this.dependentId);
  }
}
