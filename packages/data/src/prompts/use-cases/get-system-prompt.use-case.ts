import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { promptService } from "../service/prompt.service";
import type { GetPromptInput, PromptDto } from "../models/prompt.model";

export class GetSystemPromptUseCase extends UseCase<
  GetPromptInput,
  PromptDto | null
> {
  protected async run(input: GetPromptInput): Promise<PromptDto | null> {
    return promptService.get(input);
  }
}
