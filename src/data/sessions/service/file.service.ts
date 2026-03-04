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
    return fileRepository.upload(
      input.userId,
      input.profileId,
      input.sessionId,
      {
        name: input.name,
        mimeType: input.mimeType,
        size: input.size,
        buffer: input.buffer,
      },
    );
  }

  async getById(input: FileRefInput): Promise<FileDto | null> {
    return fileRepository.findById(
      input.userId,
      input.profileId,
      input.sessionId,
      input.fileId,
    );
  }

  /** Like getById but skips the signed-URL refresh — lighter, safe for server-only extraction. */
  async getRaw(input: {
    userId: string;
    profileId: string;
    sessionId: string;
    fileId: string;
  }): Promise<FileDto | null> {
    return fileRepository.findByIdRaw(
      input.userId,
      input.profileId,
      input.sessionId,
      input.fileId,
    );
  }

  async list(input: ListFilesInput): Promise<FileDto[]> {
    return fileRepository.list(input.userId, input.profileId, input.sessionId);
  }

  async listAllForUser(userId: string): Promise<FileDto[]> {
    return fileRepository.listAllForUserUnordered(userId);
  }

  async getStorageMetrics(userId: string): Promise<StorageMetricsDto> {
    return fileRepository.getStorageMetrics(userId);
  }

  async delete(input: FileRefInput): Promise<void> {
    await fileRepository.delete(
      input.userId,
      input.profileId,
      input.sessionId,
      input.fileId,
    );
  }

  async patchExtractedData(
    input: FileRefInput,
    extractedData: ExtractedPrescriptionData,
  ): Promise<void> {
    await fileRepository.patch(
      input.userId,
      input.profileId,
      input.sessionId,
      input.fileId,
      {
        extractedData,
      },
    );
  }
}

/** Singleton — import this throughout the application. */
export const fileService = new FileService();
