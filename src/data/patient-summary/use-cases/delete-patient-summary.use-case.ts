import {
  patientSummaryService,
  type PatientSummaryService,
} from "../service/patient-summary.service";
import {
  DeletePatientSummarySchema,
  type DeletePatientSummaryInput,
} from "../models/patient-summary.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({ sourceIdField: "summaryId", remove: true })
export class DeletePatientSummaryUseCase extends UseCase<
  DeletePatientSummaryInput,
  void
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: PatientSummaryService = patientSummaryService,
  ) {
    super();
  }

  static validate(input: unknown): DeletePatientSummaryInput {
    return DeletePatientSummarySchema.parse(input);
  }

  protected async run(input: DeletePatientSummaryInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
