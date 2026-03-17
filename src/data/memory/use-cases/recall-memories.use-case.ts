import { memoryService, type MemoryService } from "../service/memory.service";
import {
  RecallMemoriesSchema,
  type RecallMemoriesInput,
  type MemoryDto,
} from "../models/memory.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class RecallMemoriesUseCase extends UseCase<
  RecallMemoriesInput,
  MemoryDto[]
> {
  constructor(private readonly service: MemoryService = memoryService) {
    super();
  }

  static validate(input: unknown): RecallMemoriesInput {
    return RecallMemoriesSchema.parse(input);
  }

  protected async run(input: RecallMemoriesInput): Promise<MemoryDto[]> {
    return this.service.recall(input);
  }
}
