import { fileService, type FileService } from "../service/file.service";
import {
  FileRefSchema,
  type FileRefInput,
  type FileDto,
} from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetFileUseCase extends UseCase<FileRefInput, FileDto | null> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): FileRefInput {
    return FileRefSchema.parse(input);
  }

  protected async run(input: FileRefInput): Promise<FileDto | null> {
    return this.service.getById(input);
  }
}
