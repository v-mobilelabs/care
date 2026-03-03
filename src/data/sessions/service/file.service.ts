import { fileRepository } from "../repositories/file.repository";
import type {
  FileDto,
  UploadFileInput,
  FileRefInput,
  ListFilesInput,
  ExtractedPrescriptionData,
} from "../models/file.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class FileService {
  async upload(input: UploadFileInput): Promise<FileDto> {
    return fileRepository.upload(input.userId, input.sessionId, {
      name: input.name,
      mimeType: input.mimeType,
      size: input.size,
      buffer: input.buffer,
    });
  }

  async getById(input: FileRefInput): Promise<FileDto | null> {
    return fileRepository.findById(input.userId, input.sessionId, input.fileId);
  }

  /** Like getById but skips the signed-URL refresh — lighter, safe for server-only extraction. */
  async getRaw(input: {
    userId: string;
    sessionId: string;
    fileId: string;
  }): Promise<FileDto | null> {
    return fileRepository.findByIdRaw(
      input.userId,
      input.sessionId,
      input.fileId,
    );
  }

  async list(input: ListFilesInput): Promise<FileDto[]> {
    return fileRepository.list(input.userId, input.sessionId);
  }

  async listAllForUser(userId: string): Promise<FileDto[]> {
    return fileRepository.listAllForUser(userId);
  }

  async delete(input: FileRefInput): Promise<void> {
    await fileRepository.delete(input.userId, input.sessionId, input.fileId);
  }

  async patchExtractedData(
    input: FileRefInput,
    extractedData: ExtractedPrescriptionData,
  ): Promise<void> {
    await fileRepository.patch(input.userId, input.sessionId, input.fileId, {
      extractedData,
    });
  }
}

/** Singleton — import this throughout the application. */
export const fileService = new FileService();
