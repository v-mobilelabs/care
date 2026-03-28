import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  GeminiLiveTokenService,
  type GeminiLiveTokenResult,
} from "@/data/live/service/gemini-live-token.service";

const CreateGeminiLiveTokenSchema = z.object({
  userId: z.string().min(1),
  model: z.string().default("gemini-3.1-flash-live-preview"),
  responseModalities: z
    .array(z.enum(["AUDIO", "TEXT"]))
    .min(1)
    .default(["AUDIO"]),
  temperature: z.number().min(0).max(2).default(0.6),
  sessionDurationMinutes: z.number().int().min(1).max(60).default(30),
  newSessionWindowSeconds: z.number().int().min(30).max(600).default(60),
});

export type CreateGeminiLiveTokenInput = z.infer<
  typeof CreateGeminiLiveTokenSchema
>;

export interface CreateGeminiLiveTokenOutput {
  readonly accessToken: string;
  readonly expireTime?: string;
  readonly newSessionExpireTime?: string;
  readonly model: string;
  readonly wsUrl: string;
}

export class CreateGeminiLiveTokenUseCase extends UseCase<
  CreateGeminiLiveTokenInput,
  CreateGeminiLiveTokenOutput
> {
  static validate(input: unknown): CreateGeminiLiveTokenInput {
    return CreateGeminiLiveTokenSchema.parse(input);
  }

  private readonly service = new GeminiLiveTokenService();

  protected async run(
    input: CreateGeminiLiveTokenInput,
  ): Promise<CreateGeminiLiveTokenOutput> {
    const token: GeminiLiveTokenResult =
      await this.service.createEphemeralToken({
        model: input.model,
        responseModalities: input.responseModalities,
        temperature: input.temperature,
        sessionDurationMinutes: input.sessionDurationMinutes,
        newSessionWindowSeconds: input.newSessionWindowSeconds,
      });

    const wsUrl =
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained" +
      `?access_token=${encodeURIComponent(token.name)}`;

    return {
      accessToken: token.name,
      expireTime: token.expireTime,
      newSessionExpireTime: token.newSessionExpireTime,
      model: input.model,
      wsUrl,
    };
  }
}
