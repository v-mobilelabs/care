import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { bucket } from "@/lib/firebase/admin";
import { fileRepository } from "@/data/sessions/repositories/file.repository";
import { insuranceRepository } from "@/data/insurance/repositories/insurance.repository";

// ── Schema ────────────────────────────────────────────────────────────────────

const GetFileSignedUrlInputSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  dependentId: z.string().optional(),
  fileId: z.string().min(1),
});

export type GetFileSignedUrlInput = z.infer<typeof GetFileSignedUrlInputSchema>;

/** Signed URL lifetime: 1 hour. */
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000;

// ── UseCase ───────────────────────────────────────────────────────────────────

export class GetFileSignedUrlUseCase extends UseCase<
  GetFileSignedUrlInput,
  string
> {
  static validate(input: unknown): GetFileSignedUrlInput {
    return GetFileSignedUrlInputSchema.parse(input);
  }

  protected async run(input: GetFileSignedUrlInput): Promise<string> {
    const storagePath = await this.resolveStoragePath(input);
    if (!storagePath) {
      throw new Error("FILE_NOT_FOUND");
    }

    const [url] = await bucket.file(storagePath).getSignedUrl({
      action: "read" as const,
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    return url;
  }

  private async resolveStoragePath(
    input: GetFileSignedUrlInput,
  ): Promise<string | null> {
    // 1. Files — direct lookup under current profile
    const file = await fileRepository.findByIdRaw(
      input.profileId,
      input.fileId,
    );
    if (file) return file.storagePath;

    // 2. Files — cross-profile collectionGroup query
    const crossProfile = await fileRepository.findByIdForUser(
      input.userId,
      input.fileId,
    );
    if (crossProfile) return crossProfile.storagePath;

    // 3. Insurance documents
    const insurance = await insuranceRepository.findByIdRaw(
      input.userId,
      input.fileId,
      input.dependentId,
    );
    if (insurance?.documentStoragePath) return insurance.documentStoragePath;

    return null;
  }
}
