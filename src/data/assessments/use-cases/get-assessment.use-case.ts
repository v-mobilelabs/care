import {
  assessmentService,
  type AssessmentService,
} from "../service/assessment.service";
import {
  AssessmentRefSchema,
  type AssessmentRefInput,
  type AssessmentDto,
} from "../models/assessment.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetAssessmentUseCase extends UseCase<
  AssessmentRefInput,
  AssessmentDto | null
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AssessmentService = assessmentService,
  ) {
    super();
  }

  static validate(input: unknown): AssessmentRefInput {
    return AssessmentRefSchema.parse(input);
  }

  protected async run(
    input: AssessmentRefInput,
  ): Promise<AssessmentDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
