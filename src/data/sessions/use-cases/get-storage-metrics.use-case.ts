import { fileService, type FileService } from "../service/file.service";
import { z } from "zod";
import type { StorageMetricsDto } from "../models/file.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

const GetStorageMetricsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
});

type GetStorageMetricsInput = z.infer<typeof GetStorageMetricsSchema>;

export class GetStorageMetricsUseCase extends UseCase<
  GetStorageMetricsInput,
  StorageMetricsDto
> {
  constructor(private readonly service: FileService = fileService) {
    super();
  }

  static validate(input: unknown): GetStorageMetricsInput {
    return GetStorageMetricsSchema.parse(input);
  }

  protected async run(
    input: GetStorageMetricsInput,
  ): Promise<StorageMetricsDto> {
    return this.service.getStorageMetrics(input.userId);
  }
}
