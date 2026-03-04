// server-only — never import in client components.
import { aiService, type AIService } from "@/data/shared/service/ai.service";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import {
  fileService,
  type FileService,
} from "@/data/sessions/service/file.service";
import {
  promptService,
  type PromptService,
} from "@/data/prompts/service/prompt.service";
import {
  ExtractionSchema,
  type ExtractResult,
  type ExtractPrescriptionInput,
} from "../models/extract.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class PrescriptionExtractionService {
  constructor(
    private readonly files: FileService = fileService,
    private readonly ai: AIService = aiService,
    private readonly firebase: FirebaseService = FirebaseService.getInstance(),
    private readonly prompts: PromptService = promptService,
  ) {}

  async extract(input: ExtractPrescriptionInput): Promise<ExtractResult> {
    // 1. Resolve file metadata (raw — no signed-URL refresh needed for extraction)
    const file = await this.files.getRaw({
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId!,
      fileId: input.fileId,
    });
    if (!file) {
      throw Object.assign(
        new Error(
          `[PrescriptionExtractionService] File not found — userId=${input.userId} sessionId=${input.sessionId} fileId=${input.fileId}`,
        ),
        { code: "FILE_NOT_FOUND" },
      );
    }

    // 2. Download bytes from Cloud Storage
    const [bytes] = await this.firebase
      .getBucket()
      .file(file.storagePath)
      .download();
    const base64 = bytes.toString("base64");
    const dataUri = `data:${file.mimeType};base64,${base64}`;

    // 3. Build AI SDK content part (image vs PDF/file)
    const mediaPart = file.mimeType.startsWith("image/")
      ? { type: "image" as const, image: dataUri }
      : {
          type: "file" as const,
          data: dataUri,
          mediaType: file.mimeType as `${string}/${string}`,
        };

    // 4. Extract structured data via Gemini (consumes 1 credit for the user)
    const prompt =
      this.prompts.get({ id: "prescription-extraction" })?.content ?? "";

    return this.ai.extractObject(
      ExtractionSchema,
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

/** Singleton — import this throughout the server-side application. */
export const prescriptionExtractionService =
  new PrescriptionExtractionService();
