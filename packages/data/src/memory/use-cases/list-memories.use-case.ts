import { memoryService, type MemoryService } from "../service/memory.service";
import {
  ListMemoriesSchema,
  type ListMemoriesInput,
  type PaginatedMemoriesDto,
} from "../models/memory.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListMemoriesUseCase extends UseCase<
  ListMemoriesInput,
  PaginatedMemoriesDto
> {
  constructor(private readonly service: MemoryService = memoryService) {
    super();
  }

  static validate(input: unknown): ListMemoriesInput {
    return ListMemoriesSchema.parse(input);
  }

  protected async run(input: ListMemoriesInput): Promise<PaginatedMemoriesDto> {
    return this.service.list(input);
  }
}
