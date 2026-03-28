import { GoogleGenAI, Modality } from "@google/genai";

export interface GeminiLiveTokenRequest {
  readonly model: string;
  readonly responseModalities: readonly ("AUDIO" | "TEXT")[];
  readonly temperature: number;
  readonly sessionDurationMinutes: number;
  readonly newSessionWindowSeconds: number;
}

export interface GeminiLiveTokenResult {
  readonly name: string;
  readonly expireTime?: string;
  readonly newSessionExpireTime?: string;
}

export class GeminiLiveTokenService {
  async createEphemeralToken(
    input: Readonly<GeminiLiveTokenRequest>,
  ): Promise<GeminiLiveTokenResult> {
    const apiKey = this.getApiKey();
    const now = new Date();
    const expireTime = new Date(
      now.getTime() + input.sessionDurationMinutes * 60_000,
    ).toISOString();
    const newSessionExpireTime = new Date(
      now.getTime() + input.newSessionWindowSeconds * 1_000,
    ).toISOString();

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: "v1alpha",
    });
    const responseModalities = input.responseModalities.map((modality) => {
      if (modality === "AUDIO") return Modality.AUDIO;
      return Modality.TEXT;
    });

    const token = await ai.authTokens.create({
      config: {
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: input.model,
          config: {
            temperature: input.temperature,
            responseModalities,
            sessionResumption: {},
            contextWindowCompression: { slidingWindow: {} },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: { disabled: false },
            },
          },
        },
      },
    });

    if (!token.name) {
      throw new Error(
        "[GeminiLiveTokenService] Token response missing `name` field.",
      );
    }

    return {
      name: token.name,
      expireTime,
      newSessionExpireTime,
    };
  }

  private getApiKey(): string {
    const key =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

    if (!key) {
      throw new Error(
        "Missing GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_AI_API_KEY). Add one in .env.local for Gemini Live token provisioning.",
      );
    }

    return key;
  }
}
