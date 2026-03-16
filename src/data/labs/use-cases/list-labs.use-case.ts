import { labRepository } from "../repositories/lab.repository";
import {
  ListLabsSchema,
  type ListLabsInput,
  type LabDto,
} from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListLabsUseCase extends UseCase<ListLabsInput, LabDto[]> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): ListLabsInput {
    return ListLabsSchema.parse(input);
  }

  protected async run(input: ListLabsInput): Promise<LabDto[]> {
    return labRepository.list(input.userId, input.limit, this.dependentId);
  }
}
