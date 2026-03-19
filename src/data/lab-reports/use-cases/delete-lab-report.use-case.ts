import {
  labReportService,
  type LabReportService,
} from "../service/lab-report.service";
import {
  LabReportRefSchema,
  type LabReportRefInput,
} from "../models/lab-report.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteLabReportUseCase extends UseCase<LabReportRefInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: LabReportService = labReportService,
  ) {
    super();
  }

  static validate(input: unknown): LabReportRefInput {
    return LabReportRefSchema.parse(input);
  }

  protected async run(input: LabReportRefInput): Promise<void> {
    return this.service.delete(input, this.dependentId);
  }
}
