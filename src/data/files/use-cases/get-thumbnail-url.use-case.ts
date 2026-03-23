import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { fileRepository } from "../repositories/file.repository";

// ── Schema ────────────────────────────────────────────────────────────────────

const GetThumbnailUrlInputSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  fileId: z.string().min(1),
});

export type GetThumbnailUrlInput = z.infer<typeof GetThumbnailUrlInputSchema>;

// ── UseCase ───────────────────────────────────────────────────────────────────

export class GetThumbnailUrlUseCase extends UseCase<
  GetThumbnailUrlInput,
  string | null
> {
  static validate(input: unknown): GetThumbnailUrlInput {
    return GetThumbnailUrlInputSchema.parse(input);
  }

  protected async run(input: GetThumbnailUrlInput): Promise<string | null> {
    const { userId, profileId, fileId } = input;

    const url = await fileRepository.getThumbnailSignedUrl(profileId, fileId);
    if (url) return url;

    // Cross-profile: find the file, then get thumbnail from its actual profile.
    const file = await fileRepository.findByIdForUser(userId, fileId);
    if (!file) return null;
    const ownerProfileId = file.storagePath.split("/")[1];
    if (!ownerProfileId) return null;
    return fileRepository.getThumbnailSignedUrl(ownerProfileId, fileId);
  }
}
