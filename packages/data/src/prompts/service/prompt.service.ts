import { promptRepository } from "../repositories/prompt.repository";
import type { PromptDto, GetPromptInput } from "../models/prompt.model";

export class PromptService {
  get(input: GetPromptInput): PromptDto | null {
    return promptRepository.findById(input.id);
  }
}

export const promptService = new PromptService();
