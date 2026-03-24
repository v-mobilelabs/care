import { memoryService, type MemoryService } from "../service/memory.service";
import {
  DeleteManyMemoriesSchema,
  type DeleteManyMemoriesInput,
} from "../models/memory.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteManyMemoriesUseCase extends UseCase<
  DeleteManyMemoriesInput,
  void
> {
  constructor(private readonly service: MemoryService = memoryService) {
    super();
  }

  static validate(input: unknown): DeleteManyMemoriesInput {
    return DeleteManyMemoriesSchema.parse(input);
  }

  protected async run(input: DeleteManyMemoriesInput): Promise<void> {
    return this.service.deleteMany(input);
  }
}
