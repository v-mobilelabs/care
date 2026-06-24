import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  SubmitFeedbackSchema,
  type SubmitFeedbackInput,
} from "../models/feedback.model";
import { feedbackRepository } from "../repositories/feedback.repository";

export class SubmitFeedbackUseCase extends UseCase<SubmitFeedbackInput, void> {
  static validate(input: unknown): SubmitFeedbackInput {
    return SubmitFeedbackSchema.parse(input);
  }

  protected async run(input: SubmitFeedbackInput): Promise<void> {
    await feedbackRepository.create(input);
  }
}
