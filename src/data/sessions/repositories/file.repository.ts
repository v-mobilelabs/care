import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import type { FileDocument, FileDto } from "../models/file.model";
import { toFileDto } from "../models/file.model";

const firebaseService = FirebaseService.getInstance();
const db = firebaseService.getDb();
const bucket = firebaseService.getBucket();

// ── Path helpers ─────────────────────────────────────────────────────────────

const filesCol = (userId: string, sessionId: string) =>
  db.collection(`users/${userId}/sessions/${sessionId}/files`);

const fileDoc = (userId: string, sessionId: string, fileId: string) =>
  filesCol(userId, sessionId).doc(fileId);

/** GCS object path for a file */
const storagePath = (
  userId: string,
  sessionId: string,
  fileId: string,
  name: string,
) => `users/${userId}/sessions/${sessionId}/files/${fileId}/${name}`;

/** Signed URL expiry — 1 hour */
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000;

// ── Repository ────────────────────────────────────────────────────────────────

export const fileRepository = {
  /**
   * Upload `buffer` to GCS and persist metadata to Firestore.
   * Returns the new FileDto with a fresh signed download URL.
   */
  async upload(
    userId: string,
    sessionId: string,
    data: Pick<FileDocument, "name" | "mimeType" | "size"> & {
      buffer: Buffer;
    },
  ): Promise<FileDto> {
    // 1. Reserve a Firestore doc ID so we can embed it in the storage path.
    const ref = filesCol(userId, sessionId).doc();
    const fileId = ref.id;
    const gcsPath = storagePath(userId, sessionId, fileId, data.name);

    // 2. Upload to Cloud Storage.
    const gcsFile = bucket.file(gcsPath);
    await gcsFile.save(data.buffer, {
      contentType: data.mimeType,
      metadata: { cacheControl: "private, max-age=31536000" },
    });

    // 3. Generate a signed download URL (1 h).
    const [downloadUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });

    // 4. Write Firestore metadata.
    const doc: FileDocument = {
      sessionId,
      userId,
      name: data.name,
      mimeType: data.mimeType,
      size: data.size,
      storagePath: gcsPath,
      downloadUrl,
      createdAt: Timestamp.now(),
    };
    await ref.set(doc);
    return toFileDto(fileId, doc);
  },

  async findByIdRaw(
    userId: string,
    sessionId: string,
    fileId: string,
  ): Promise<FileDto | null> {
    const snap = await fileDoc(userId, sessionId, fileId).get();
    if (!snap.exists) return null;
    return toFileDto(snap.id, snap.data() as FileDocument);
  },

  /**
   * Find a file by ID for a user across ALL sessions (collectionGroup).
   * Use this when the sessionId is unknown or may not match the stored value.
   */
  async findByIdForUser(
    userId: string,
    fileId: string,
  ): Promise<FileDto | null> {
    const snap = await db
      .collectionGroup("files")
      .where("userId", "==", userId)
      .get();
    const match = snap.docs.find((d) => d.id === fileId);
    if (!match) return null;
    return toFileDto(match.id, match.data() as FileDocument);
  },

  async findById(
    userId: string,
    sessionId: string,
    fileId: string,
  ): Promise<FileDto | null> {
    const snap = await fileDoc(userId, sessionId, fileId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as FileDocument;

    // Refresh the signed URL so the caller always gets a valid link.
    const gcsFile = bucket.file(doc.storagePath);
    const [freshUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    await snap.ref.update({ downloadUrl: freshUrl });

    return toFileDto(snap.id, { ...doc, downloadUrl: freshUrl });
  },

  async list(userId: string, sessionId: string): Promise<FileDto[]> {
    const snap = await filesCol(userId, sessionId)
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toFileDto(d.id, d.data() as FileDocument),
    );
  },

  /** List all files for a user across every session, newest first. */
  async listAllForUser(userId: string): Promise<FileDto[]> {
    const snap = await db
      .collectionGroup("files")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toFileDto(d.id, d.data() as FileDocument),
    );
  },

  /** Delete GCS object and Firestore metadata. */
  async delete(
    userId: string,
    sessionId: string,
    fileId: string,
  ): Promise<void> {
    const snap = await fileDoc(userId, sessionId, fileId).get();
    if (!snap.exists) return;
    const doc = snap.data() as FileDocument;

    // Delete from GCS (ignore "not found" errors).
    try {
      await bucket.file(doc.storagePath).delete();
    } catch {
      /* file may already be deleted */
    }

    await snap.ref.delete();
  },

  /** Patch arbitrary fields on an existing file document (e.g. extractedData). */
  async patch(
    userId: string,
    sessionId: string,
    fileId: string,
    data: Partial<Pick<FileDocument, "extractedData">>,
  ): Promise<void> {
    await fileDoc(userId, sessionId, fileId).update(
      data as Record<string, unknown>,
    );
  },

  /** Delete all files for a session (used when deleting the session). */
  async deleteAll(userId: string, sessionId: string): Promise<void> {
    const snap = await filesCol(userId, sessionId).get();
    const batch = db.batch();

    await Promise.all(
      snap.docs.map(async (d: QueryDocumentSnapshot) => {
        const doc = d.data() as FileDocument;
        try {
          await bucket.file(doc.storagePath).delete();
        } catch {
          /* ignore */
        }
        batch.delete(d.ref);
      }),
    );

    await batch.commit();
  },
};
