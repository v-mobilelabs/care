import { labService, type LabService } from "../service/lab.service";
import {
  LabRefSchema,
  type LabRefInput,
  type LabDto,
} from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetLabUseCase extends UseCase<LabRefInput, LabDto | null> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: LabService = labService,
  ) {
    super();
  }

  static validate(input: unknown): LabRefInput {
    return LabRefSchema.parse(input);
  }

  protected async run(input: LabRefInput): Promise<LabDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
