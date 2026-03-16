// server-only — never import in client components.
import { aiService, type AIService } from "@/data/shared/service/ai.service";
import { bucket } from "@/lib/firebase/admin";
import {
  InsuranceExtractionSchema,
  type ExtractInsuranceInput,
  type InsuranceExtractResult,
} from "../models/extract.model";

const EXTRACTION_PROMPT = `You are an insurance document extraction assistant.
Extract all visible details from this health insurance card or document.
Fields to extract: provider/company name, plan name, policy number, group number, member ID, subscriber name, type of insurance (health/dental/vision/life/disability/other), effective date, expiration date, copay amount, deductible amount, out-of-pocket maximum.
Return ISO date format (YYYY-MM-DD) for dates when possible.
Return only information that is clearly visible — do not guess or infer missing fields.`;

export class InsuranceExtractionService {
  constructor(private readonly ai: AIService = aiService) {}

  async extract(input: ExtractInsuranceInput): Promise<InsuranceExtractResult> {
    // 1. Download bytes from Cloud Storage
    const [bytes] = await bucket.file(input.storagePath).download();
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

    // 3. Extract structured data via AI
    return this.ai.extractObject(
      InsuranceExtractionSchema,
      [
        {
          role: "user",
          content: [
            mediaPart,
            { type: "text" as const, text: EXTRACTION_PROMPT },
          ],
        },
      ],
      { userId: input.userId },
    );
  }
}

export const insuranceExtractionService = new InsuranceExtractionService();
