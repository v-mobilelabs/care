import { labService, type LabService } from "../service/lab.service";
import { LabRefSchema, type LabRefInput } from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteLabUseCase extends UseCase<LabRefInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: LabService = labService,
  ) {
    super();
  }

  static validate(input: unknown): LabRefInput {
    return LabRefSchema.parse(input);
  }

  protected async run(input: LabRefInput): Promise<void> {
    return this.service.delete(input, this.dependentId);
  }
}
