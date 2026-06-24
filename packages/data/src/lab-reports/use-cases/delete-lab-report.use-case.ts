import {
  labReportService,
  type LabReportService,
} from "../service/lab-report.service";
import {
  LabReportRefSchema,
  type LabReportRefInput,
} from "../models/lab-report.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({ sourceIdField: "labReportId", remove: true })
export class DeleteLabReportUseCase extends UseCase<LabReportRefInput, void> {
  constructor(private readonly service: LabReportService = labReportService) {
    super();
  }

  static validate(input: unknown): LabReportRefInput {
    return LabReportRefSchema.parse(input);
  }

  protected async run(input: LabReportRefInput): Promise<void> {
    return this.service.delete(input);
  }
}
