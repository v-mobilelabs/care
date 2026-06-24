import { fileService, type FileService } from "../service/file.service";
import { FileRefSchema, type FileRefInput } from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteFileUseCase extends UseCase<FileRefInput, void> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): FileRefInput {
    return FileRefSchema.parse(input);
  }

  protected async run(input: FileRefInput): Promise<void> {
    return this.service.delete(input);
  }
}
