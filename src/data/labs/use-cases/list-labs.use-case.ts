import { labService, type LabService } from "../service/lab.service";
import {
  ListLabsSchema,
  type ListLabsInput,
  type LabDto,
} from "../models/lab.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListLabsUseCase extends UseCase<ListLabsInput, LabDto[]> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: LabService = labService,
  ) {
    super();
  }

  static validate(input: unknown): ListLabsInput {
    return ListLabsSchema.parse(input);
  }

  protected async run(input: ListLabsInput): Promise<LabDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
