import { kbContextRepository } from "../repositories/kb-context.repository";
import type {
  CreateKBContextInput,
  KBContextDto,
  KBContextDocumentItem,
} from "../models/kb-context.model";

export class KBContextService {
  /**
   * Create a new KB context for a session.
   */
  async create(input: CreateKBContextInput): Promise<KBContextDto> {
    return kbContextRepository.create(input);
  }

  /**
   * Get a KB context by ID.
   */
  async get(contextId: string): Promise<KBContextDto | null> {
    return kbContextRepository.findById(contextId);
  }

  /**
   * Add a message/document to the context.
   */
  async addDocument(
    contextId: string,
    document: Omit<KBContextDocumentItem, "timestamp">,
  ): Promise<string> {
    return kbContextRepository.addDocument(contextId, document);
  }

  /**
   * Retrieve all documents in a context.
   */
  async getDocuments(contextId: string) {
    return kbContextRepository.getDocuments(contextId);
  }

  /**
   * Delete a context.
   */
  async delete(contextId: string): Promise<void> {
    return kbContextRepository.delete(contextId);
  }
}

export const kbContextService = new KBContextService();
