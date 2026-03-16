import { labRepository } from "../repositories/lab.repository";
import {
  CreateLabSchema,
  type CreateLabInput,
  type LabDto,
} from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateLabUseCase extends UseCase<CreateLabInput, LabDto> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): CreateLabInput {
    return CreateLabSchema.parse(input);
  }

  protected async run(input: CreateLabInput): Promise<LabDto> {
    return labRepository.create(input.userId, input, this.dependentId);
  }
}
