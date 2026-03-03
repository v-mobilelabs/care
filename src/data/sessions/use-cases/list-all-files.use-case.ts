import { fileService, type FileService } from "../service/file.service";
import { z } from "zod";
import type { FileDto } from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

const ListAllFilesSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
});

type ListAllFilesInput = z.infer<typeof ListAllFilesSchema>;

export class ListAllFilesUseCase extends UseCase<ListAllFilesInput, FileDto[]> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): ListAllFilesInput {
    return ListAllFilesSchema.parse(input);
  }

  protected async run(input: ListAllFilesInput): Promise<FileDto[]> {
    return this.service.listAllForUser(input.userId);
  }
}
