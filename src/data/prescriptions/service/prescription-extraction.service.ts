// server-only — never import in client components.
import { aiService, type AIService } from "@/data/shared/service/ai.service";
import { bucket } from "@/lib/firebase/admin";
import {
  fileService,
  type FileService,
} from "@/data/sessions/service/file.service";
import {
  ExtractionSchema,
  type ExtractPrescriptionInput,
} from "../models/extract.model";
import { prescriptionRepository } from "../repositories/prescription.repository";
import type {
  PrescriptionDto,
  PrescriptionMedication,
} from "../models/prescription.model";

const EXTRACTION_PROMPT = `You are a clinical data extraction assistant.
Extract ALL medications from this prescription accurately.
For each medication extract: name, dosage, form, frequency, duration, instructions, and condition/indication if present.
Also capture the prescribing doctor name and prescription date if visible.
Return only information that is clearly visible — do not guess or infer missing fields.`;

// ── Service ───────────────────────────────────────────────────────────────────

export class PrescriptionExtractionService {
  constructor(
    private readonly files: FileService = fileService,
    private readonly ai: AIService = aiService,
  ) {}

  async extract(input: ExtractPrescriptionInput): Promise<PrescriptionDto> {
    // 1. Resolve file metadata (raw — no signed-URL refresh needed for extraction)
    const file = await this.files.getRaw({
      userId: input.userId,
      profileId: input.profileId,
      fileId: input.fileId,
    });
    if (!file) {
      throw Object.assign(
        new Error(
          `[PrescriptionExtractionService] File not found — userId=${input.userId} fileId=${input.fileId}`,
        ),
        { code: "FILE_NOT_FOUND" },
      );
    }

    // 2. Download bytes from Cloud Storage
    const [bytes] = await bucket.file(file.storagePath).download();
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
    const result = await this.ai.extractObject(
      ExtractionSchema,
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

    // 5. Persist the extraction result back to the file document so it survives
    //    page refreshes and is returned by GET /api/prescriptions on subsequent loads.
    await this.files.patchExtractedData(
      {
        userId: input.userId,
        profileId: input.profileId,
        fileId: input.fileId,
      },
      result,
    );

    // 6. Upsert into the prescriptions collection (with fileId + fileUrl)
    const existing = await prescriptionRepository.findByFileId(
      input.userId,
      input.fileId,
    );
    if (existing) return existing;

    return prescriptionRepository.create(input.userId, {
      fileId: input.fileId,
      fileUrl: file.downloadUrl ?? undefined,
      source: "extracted",
      medications: result.medications.map(
        (m): PrescriptionMedication => ({
          name: m.name,
          dosage: m.dosage ?? "",
          form: (m.form as PrescriptionMedication["form"]) ?? "Other",
          frequency: m.frequency ?? "",
          duration: m.duration ?? "",
          instructions: m.instructions,
          indication: m.condition ?? "",
        }),
      ),
      prescribedBy: result.prescribedBy ?? result.doctors?.[0]?.name,
      prescriptionDate: result.date,
      notes: result.notes,
    });
  }
}

/** Singleton — import this throughout the server-side application. */
export const prescriptionExtractionService =
  new PrescriptionExtractionService();
