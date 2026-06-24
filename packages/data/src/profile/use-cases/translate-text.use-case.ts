import { z } from "zod";
import type { ModelMessage } from "ai";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { aiService } from "@/data/shared/service/ai.service";
import { profileRepository } from "@/data/profile/repositories/profile.repository";

const TranslateTextInputSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(20_000),
  targetLanguage: z.string().trim().min(1).max(80).optional(),
});

export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().min(1),
  targetLanguage: z.string().min(1),
});

export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export class TranslateTextUseCase extends UseCase<
  TranslateTextInput,
  TranslateTextOutput
> {
  static validate(input: unknown): TranslateTextInput {
    return TranslateTextInputSchema.parse(input);
  }

  protected async run(input: TranslateTextInput): Promise<TranslateTextOutput> {
    const profile = await profileRepository.get(input.userId);

    const resolvedTargetLanguage =
      input.targetLanguage?.trim() ||
      profile?.preferredLanguage?.trim() ||
      "English";

    const messages: ModelMessage[] = [
      {
        role: "system",
        content:
          "You are a medical-safe translation assistant. Translate exactly while preserving meaning, markdown structure, lists, and code blocks. Do not add diagnosis, advice, or extra commentary. Return only the translated text.",
      },
      {
        role: "user",
        content: [
          `Target language: ${resolvedTargetLanguage}`,
          "Text to translate:",
          input.text,
        ].join("\n\n"),
      },
    ];

    const result = await aiService.extractObject(
      TranslateTextOutputSchema,
      messages,
      {
        userId: input.userId,
        useFast: true,
        skipCredit: true,
      },
    );

    return {
      translatedText: result.translatedText,
      targetLanguage: result.targetLanguage || resolvedTargetLanguage,
    };
  }
}
