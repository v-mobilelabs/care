import { fileService, type FileService } from "../service/file.service";
import {
  ListFilesSchema,
  type ListFilesInput,
  type FileDto,
} from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListFilesUseCase extends UseCase<ListFilesInput, FileDto[]> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): ListFilesInput {
    return ListFilesSchema.parse(input);
  }

  protected async run(input: ListFilesInput): Promise<FileDto[]> {
    return this.service.list(input);
  }
}
