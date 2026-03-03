// server-only — never import in client components.
import { aiService, type AIService } from "@/data/shared/service/ai.service";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import {
  promptService,
  type PromptService,
} from "@/data/prompts/service/prompt.service";
import {
  InsuranceExtractionSchema,
  type ExtractInsuranceInput,
  type InsuranceExtractResult,
} from "../models/extract.model";

export class InsuranceExtractionService {
  constructor(
    private readonly ai: AIService = aiService,
    private readonly firebase: FirebaseService = FirebaseService.getInstance(),
    private readonly prompts: PromptService = promptService,
  ) {}

  async extract(input: ExtractInsuranceInput): Promise<InsuranceExtractResult> {
    // 1. Download bytes from Cloud Storage
    const [bytes] = await this.firebase
      .getBucket()
      .file(input.storagePath)
      .download();
    const base64 = bytes.toString("base64");
    const dataUri = `data:${input.mimeType};base64,${base64}`;

    // 2. Build AI SDK content part (image vs PDF)
    const mediaPart = input.mimeType.startsWith("image/")
      ? { type: "image" as const, image: dataUri }
      : {
          type: "file" as const,
          data: dataUri,
          mediaType: input.mimeType as `${string}/${string}`,
        };

    // 3. Build prompt
    const prompt =
      this.prompts.get({ id: "insurance-extraction" })?.content ?? "";

    // 4. Extract structured data via AI
    return this.ai.extractObject(
      InsuranceExtractionSchema,
      [
        {
          role: "user",
          content: [mediaPart, { type: "text" as const, text: prompt }],
        },
      ],
      { userId: input.userId },
    );
  }
}

export const insuranceExtractionService = new InsuranceExtractionService();
