import { labRepository } from "../repositories/lab.repository";
import {
  LabRefSchema,
  type LabRefInput,
  type LabDto,
} from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetLabUseCase extends UseCase<LabRefInput, LabDto | null> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): LabRefInput {
    return LabRefSchema.parse(input);
  }

  protected async run(input: LabRefInput): Promise<LabDto | null> {
    return labRepository.findById(input.userId, input.labId, this.dependentId);
  }
}
