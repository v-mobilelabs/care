import { fileService, type FileService } from "../service/file.service";
import {
  ListAllFilesSchema,
  type ListAllFilesInput,
  type PaginatedFiles,
} from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListAllFilesUseCase extends UseCase<
  ListAllFilesInput,
  PaginatedFiles
> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): ListAllFilesInput {
    return ListAllFilesSchema.parse(input);
  }

  protected async run(input: ListAllFilesInput): Promise<PaginatedFiles> {
    return this.service.listPaginated(input);
  }
}
