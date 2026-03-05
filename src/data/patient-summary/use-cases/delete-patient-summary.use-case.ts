import {
  patientSummaryService,
  type PatientSummaryService,
} from "../service/patient-summary.service";
import {
  DeletePatientSummarySchema,
  type DeletePatientSummaryInput,
} from "../models/patient-summary.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

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
    return this.service.delete(input, this.dependentId);
  }
}
