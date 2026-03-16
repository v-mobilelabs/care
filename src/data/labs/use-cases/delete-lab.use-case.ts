import { labRepository } from "../repositories/lab.repository";
import { LabRefSchema, type LabRefInput } from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteLabUseCase extends UseCase<LabRefInput, void> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): LabRefInput {
    return LabRefSchema.parse(input);
  }

  protected async run(input: LabRefInput): Promise<void> {
    return labRepository.delete(input.userId, input.labId, this.dependentId);
  }
}
