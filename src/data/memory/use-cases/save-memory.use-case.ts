import { memoryService, type MemoryService } from "../service/memory.service";
import {
  SaveMemorySchema,
  type SaveMemoryInput,
  type MemoryDto,
} from "../models/memory.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class SaveMemoryUseCase extends UseCase<SaveMemoryInput, MemoryDto> {
  constructor(private readonly service: MemoryService = memoryService) {
    super();
  }

  static validate(input: unknown): SaveMemoryInput {
    return SaveMemorySchema.parse(input);
  }

  protected async run(input: SaveMemoryInput): Promise<MemoryDto> {
    return this.service.save(input);
  }
}
