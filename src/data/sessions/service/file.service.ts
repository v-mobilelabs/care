import { fileRepository } from "../repositories/file.repository";
import type {
  FileDto,
  UploadFileInput,
  FileRefInput,
  ListFilesInput,
  ExtractedPrescriptionData,
  StorageMetricsDto,
} from "../models/file.model";
import { USER_STORAGE_LIMIT_BYTES } from "../models/file.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class FileService {
  async upload(input: UploadFileInput): Promise<FileDto> {
    // Enforce per-user storage quota before writing to GCS/Firestore.
    const metrics = await fileRepository.getStorageMetrics(input.userId);
    if (metrics.usedBytes + input.size > USER_STORAGE_LIMIT_BYTES) {
      const remainingMB = (
        (USER_STORAGE_LIMIT_BYTES - metrics.usedBytes) /
        1024 /
        1024
      ).toFixed(1);
      throw new Error(
        `Storage quota exceeded. You have ${remainingMB} MB remaining of your ${USER_STORAGE_LIMIT_BYTES / 1024 / 1024} MB limit.`,
      );
    }
    return fileRepository.upload(input.userId, input.profileId, {
      name: input.name,
      mimeType: input.mimeType,
      size: input.size,
      buffer: input.buffer,
      sessionId: input.sessionId,
    });
  }

  async getById(input: FileRefInput): Promise<FileDto | null> {
    return fileRepository.findById(input.profileId, input.fileId);
  }

  /** Like getById but skips the signed-URL refresh — lighter, safe for server-only extraction. */
  async getRaw(input: {
    userId: string;
    profileId: string;
    fileId: string;
  }): Promise<FileDto | null> {
    return fileRepository.findByIdRaw(input.profileId, input.fileId);
  }

  async list(input: ListFilesInput): Promise<FileDto[]> {
    return fileRepository.list(input.profileId, input.sessionId);
  }

  async listAllForUser(userId: string): Promise<FileDto[]> {
    return fileRepository.listAllForUserUnordered(userId);
  }

  async getStorageMetrics(userId: string): Promise<StorageMetricsDto> {
    return fileRepository.getStorageMetrics(userId);
  }

  async delete(input: FileRefInput): Promise<void> {
    await fileRepository.delete(input.profileId, input.fileId);
  }

  async patchExtractedData(
    input: FileRefInput,
    extractedData: ExtractedPrescriptionData,
  ): Promise<void> {
    await fileRepository.patch(input.profileId, input.fileId, {
      extractedData,
    });
  }
}

/** Singleton — import this throughout the application. */
export const fileService = new FileService();
