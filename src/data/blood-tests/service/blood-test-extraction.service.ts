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
import { bloodTestRepository } from "../repositories/blood-test.repository";
import {
  BloodTestExtractionSchema,
  type BloodTestDto,
  type ExtractBloodTestInput,
} from "../models/blood-test.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class BloodTestExtractionService {
  constructor(
    private readonly files: FileService = fileService,
    private readonly ai: AIService = aiService,
    private readonly firebase: FirebaseService = FirebaseService.getInstance(),
    private readonly prompts: PromptService = promptService,
  ) {}

  async extract(input: ExtractBloodTestInput): Promise<BloodTestDto> {
    // 1. Resolve file metadata
    const file = await this.files.getRaw({
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId,
      fileId: input.fileId,
    });
    if (!file) {
      throw Object.assign(
        new Error(
          `[BloodTestExtractionService] File not found — userId=${input.userId} sessionId=${input.sessionId} fileId=${input.fileId}`,
        ),
        { code: "FILE_NOT_FOUND" },
      );
    }

    // 2. Download file bytes from Cloud Storage
    const [bytes] = await this.firebase
      .getBucket()
      .file(file.storagePath)
      .download();
    const base64 = bytes.toString("base64");
    const dataUri = `data:${file.mimeType};base64,${base64}`;

    // 3. Build AI SDK content part (image vs PDF / Office document)
    const mediaPart = file.mimeType.startsWith("image/")
      ? { type: "image" as const, image: dataUri }
      : {
          type: "file" as const,
          data: dataUri,
          mediaType: file.mimeType as `${string}/${string}`,
        };

    // 4. Extract structured data via Gemini (consumes 1 credit)
    const prompt =
      this.prompts.get({ id: "blood-test-extraction" })?.content ??
      "Extract all blood test parameters from this report accurately.";

    const extracted = await this.ai.extractObject(
      BloodTestExtractionSchema,
      [
        {
          role: "user",
          content: [mediaPart, { type: "text" as const, text: prompt }],
        },
      ],
      { userId: input.userId },
    );

    // 5. Upsert: replace an existing record tied to this file, otherwise create new
    const existing = await bloodTestRepository.findByFileId(
      input.userId,
      input.fileId,
      input.dependentId,
    );

    if (existing) {
      return bloodTestRepository.update(
        input.userId,
        existing.id,
        {
          testName: extracted.testName,
          labName: extracted.labName,
          orderedBy: extracted.orderedBy,
          testDate: extracted.testDate,
          notes: extracted.notes,
          biomarkers: extracted.biomarkers,
        },
        input.dependentId,
      );
    }

    return bloodTestRepository.create(
      input.userId,
      {
        fileId: input.fileId,
        sessionId: input.sessionId,
        testName: extracted.testName,
        labName: extracted.labName,
        orderedBy: extracted.orderedBy,
        testDate: extracted.testDate,
        notes: extracted.notes,
        biomarkers: extracted.biomarkers,
      },
      input.dependentId,
    );
  }
}

export const bloodTestExtractionService = new BloodTestExtractionService();
