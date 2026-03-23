import { z } from "zod";
import { generateThumbnail } from "../service/thumbnail.service";
import { fileRepository } from "../repositories/file.repository";

// ── Schema ────────────────────────────────────────────────────────────────────

const GenerateThumbnailInputSchema = z.object({
  fileId: z.string().min(1),
  profileId: z.string().min(1),
  mimeType: z.string().min(1),
  buffer: z.instanceof(Buffer),
});

export type GenerateThumbnailInput = z.infer<
  typeof GenerateThumbnailInputSchema
>;

// ── Use Case ──────────────────────────────────────────────────────────────────

/**
 * Generates a WebP thumbnail for an uploaded file and stores it in GCS.
 * Designed to be called fire-and-forget from the upload route's `after()`.
 *
 * For non-image file types (PDF, Word) this is a no-op — returns `null`.
 */
export class GenerateThumbnailUseCase {
  static validate(input: unknown): GenerateThumbnailInput {
    return GenerateThumbnailInputSchema.parse(input);
  }

  async execute(input: GenerateThumbnailInput): Promise<string | null> {
    const validated = GenerateThumbnailUseCase.validate(input);

    const thumbBuffer = await generateThumbnail(
      validated.buffer,
      validated.mimeType,
    );
    if (!thumbBuffer) return null;

    return fileRepository.uploadThumbnail(
      validated.profileId,
      validated.fileId,
      thumbBuffer,
    );
  }
}
