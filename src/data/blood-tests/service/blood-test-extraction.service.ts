// server-only — never import in client components.
import { aiService, type AIService } from "@/data/shared/service/ai.service";
import { bucket } from "@/lib/firebase/admin";
import {
  fileService,
  type FileService,
} from "@/data/sessions/service/file.service";
import { bloodTestRepository } from "../repositories/blood-test.repository";
import {
  BloodTestExtractionSchema,
  type BloodTestDto,
  type ExtractBloodTestInput,
} from "../models/blood-test.model";
import { ragIndexer } from "@/data/shared/service";

const EXTRACTION_PROMPT = `You are a clinical laboratory data extraction assistant.
Extract ALL biomarkers / test parameters from this blood test report accurately.
For each parameter extract: name, measured value (as a string), unit, reference range (from the report), and status (normal / low / high / critical) based on whether the value falls within the stated reference range.
Also capture: test panel name, laboratory name, ordering doctor, and test date (ISO-8601 format YYYY-MM-DD when possible).
If multiple panels appear on the same report (e.g. FBC + LFTs + Lipids), list ALL their parameters under a single testName that describes the overall report (e.g. "Comprehensive Metabolic Panel").
Mark a biomarker status as "critical" only when the report explicitly flags it as critical or the value is severely outside the reference range.
Return only information that is clearly visible — do not guess or infer missing fields.`;

// ── Service ───────────────────────────────────────────────────────────────────

export class BloodTestExtractionService {
  constructor(
    private readonly files: FileService = fileService,
    private readonly ai: AIService = aiService,
  ) {}

  async extract(input: ExtractBloodTestInput): Promise<BloodTestDto> {
    // 1. Resolve file metadata
    const file = await this.files.getRaw({
      userId: input.userId,
      profileId: input.profileId,
      fileId: input.fileId,
    });
    if (!file) {
      throw Object.assign(
        new Error(
          `[BloodTestExtractionService] File not found — userId=${input.userId} fileId=${input.fileId}`,
        ),
        { code: "FILE_NOT_FOUND" },
      );
    }

    // 2. Download file bytes from Cloud Storage
    const [bytes] = await bucket.file(file.storagePath).download();
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
    const extracted = await this.ai.extractObject(
      BloodTestExtractionSchema,
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

    // 5. Upsert: replace an existing record tied to this file, otherwise create new
    const existing = await bloodTestRepository.findByFileId(
      input.userId,
      input.fileId,
      input.dependentId,
    );

    let result: BloodTestDto;

    if (existing) {
      result = await bloodTestRepository.update(
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
    } else {
      result = await bloodTestRepository.create(
        input.userId,
        {
          fileId: input.fileId,
          fileUrl: file.downloadUrl ?? undefined,
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

    // ✅ Index for RAG (fire-and-forget)
    void ragIndexer
      .indexBloodTest(input.userId, input.profileId, result, input.dependentId)
      .catch((err) => console.error("[RAG] Blood test indexing failed:", err));

    return result;
  }
}

export const bloodTestExtractionService = new BloodTestExtractionService();
