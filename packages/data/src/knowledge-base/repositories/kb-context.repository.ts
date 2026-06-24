import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import {
  KB_CONTEXT_COLLECTION,
  toKBContextDto,
  type KBContextDocument,
  type KBContextDto,
  type CreateKBContextInput,
  type KBContextDocumentItem,
} from "../models/kb-context.model";

// ── Collection helpers ────────────────────────────────────────────────────────

const contextCol = () => db.collection(KB_CONTEXT_COLLECTION);
const contextDoc = (contextId: string) => contextCol().doc(contextId);
const contextDocumentsCol = (contextId: string) =>
  contextDoc(contextId).collection("documents");

// ── Repository ────────────────────────────────────────────────────────────────

export const kbContextRepository = {
  /**
   * Create a new KB context when a session is created.
   * Uses the same ID as the session for consistency.
   */
  async create(input: CreateKBContextInput): Promise<KBContextDto> {
    const data: KBContextDocument = {
      contextId: input.contextId,
      userId: input.userId,
      profileId: input.profileId,
      sessionTitle: input.sessionTitle ?? "New Session",
      metadata: {
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messageCount: 0,
        documentCount: 0,
      },
    };

    await contextDoc(input.contextId).set(data);
    return toKBContextDto(data);
  },

  /**
   * Retrieve a KB context by ID.
   */
  async findById(contextId: string): Promise<KBContextDto | null> {
    const snap = await contextDoc(contextId).get();
    if (!snap.exists) return null;
    return toKBContextDto(snap.data() as KBContextDocument);
  },

  /**
   * Add a document (message) to the context.
   */
  async addDocument(
    contextId: string,
    document: Omit<KBContextDocumentItem, "timestamp">,
  ): Promise<string> {
    const docRef = await contextDocumentsCol(contextId).add({
      ...document,
      timestamp: Timestamp.now(),
    });

    // Increment document count and update timestamp
    const ctx = await this.findById(contextId);
    if (ctx) {
      await contextDoc(contextId).update({
        "metadata.documentCount": (ctx.metadata.documentCount || 0) + 1,
        "metadata.updatedAt": Timestamp.now(),
      });
    }

    return docRef.id;
  },

  /**
   * Retrieve all documents in a context.
   */
  async getDocuments(contextId: string) {
    const snap = await contextDocumentsCol(contextId)
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as KBContextDocumentItem),
    }));
  },

  /**
   * Delete a context and all its documents.
   */
  async delete(contextId: string): Promise<void> {
    // Delete all documents in the subcollection
    const docs = await contextDocumentsCol(contextId).get();
    for (const doc of docs.docs) {
      await doc.ref.delete();
    }
    // Delete the context itself
    await contextDoc(contextId).delete();
  },

  /**
   * Update context metadata (e.g., message count).
   */
  async updateMetadata(
    contextId: string,
    metadata: Partial<KBContextDocument["metadata"]>,
  ): Promise<void> {
    await contextDoc(contextId).update({
      "metadata.updatedAt": Timestamp.now(),
      ...(metadata.messageCount !== undefined && {
        "metadata.messageCount": metadata.messageCount,
      }),
      ...(metadata.documentCount !== undefined && {
        "metadata.documentCount": metadata.documentCount,
      }),
    });
  },
};
