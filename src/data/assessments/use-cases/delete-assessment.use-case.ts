import {
  assessmentService,
  type AssessmentService,
} from "../service/assessment.service";
import {
  AssessmentRefSchema,
  type AssessmentRefInput,
} from "../models/assessment.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({ sourceIdField: "assessmentId", remove: true })
export class DeleteAssessmentUseCase extends UseCase<AssessmentRefInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: AssessmentService = assessmentService,
  ) {
    super();
  }

  static validate(input: unknown): AssessmentRefInput {
    return AssessmentRefSchema.parse(input);
  }

  protected async run(input: AssessmentRefInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
