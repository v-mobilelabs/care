import { memoryService, type MemoryService } from "../service/memory.service";
import {
  DeleteMemorySchema,
  type DeleteMemoryInput,
} from "../models/memory.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteMemoryUseCase extends UseCase<DeleteMemoryInput, void> {
  constructor(private readonly service: MemoryService = memoryService) {
    super();
  }

  static validate(input: unknown): DeleteMemoryInput {
    return DeleteMemorySchema.parse(input);
  }

  protected async run(input: DeleteMemoryInput): Promise<void> {
    return this.service.delete(input);
  }
}
