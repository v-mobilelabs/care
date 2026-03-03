import { fileService, type FileService } from "../service/file.service";
import {
  UploadFileSchema,
  type UploadFileInput,
  type FileDto,
} from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class UploadFileUseCase extends UseCase<UploadFileInput, FileDto> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): UploadFileInput {
    return UploadFileSchema.parse(input);
  }

  protected async run(input: UploadFileInput): Promise<FileDto> {
    return this.service.upload(input);
  }
}
