import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import type {
  FileDocument,
  FileDto,
  StorageMetricsDto,
} from "../models/file.model";
import { toFileDto, USER_STORAGE_LIMIT_BYTES } from "../models/file.model";

const firebaseService = FirebaseService.getInstance();
const db = firebaseService.getDb();
const bucket = firebaseService.getBucket();

// ── Path helpers ─────────────────────────────────────────────────────────────

const filesCol = (userId: string, profileId: string, sessionId: string) =>
  db.collection(`profiles/${profileId}/sessions/${sessionId}/files`);

const fileDoc = (
  userId: string,
  profileId: string,
  sessionId: string,
  fileId: string,
) => filesCol(userId, profileId, sessionId).doc(fileId);

/** GCS object path for a file */
const storagePath = (
  userId: string,
  profileId: string,
  sessionId: string,
  fileId: string,
  name: string,
) => `profiles/${profileId}/sessions/${sessionId}/files/${fileId}/${name}`;

/** Signed URL expiry — 7 days (GCS maximum for service-account-signed URLs). */
const SIGNED_URL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Refresh URLs that expire within this window (1 day). */
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ── Repository ────────────────────────────────────────────────────────────────

export const fileRepository = {
  /**
   * Upload `buffer` to GCS and persist metadata to Firestore.
   * Returns the new FileDto with a fresh signed download URL.
   */
  async upload(
    userId: string,
    profileId: string,
    sessionId: string,
    data: Pick<FileDocument, "name" | "mimeType" | "size"> & {
      buffer: Buffer;
    },
  ): Promise<FileDto> {
    // 1. Reserve a Firestore doc ID so we can embed it in the storage path.
    const ref = filesCol(userId, profileId, sessionId).doc();
    const fileId = ref.id;
    const gcsPath = storagePath(
      userId,
      profileId,
      sessionId,
      fileId,
      data.name,
    );

    // 2. Upload to Cloud Storage.
    const gcsFile = bucket.file(gcsPath);
    await gcsFile.save(data.buffer, {
      contentType: data.mimeType,
      metadata: { cacheControl: "private, max-age=31536000" },
    });

    // 3. Generate a signed download URL (7 days).
    const urlExpiresAt = Date.now() + SIGNED_URL_EXPIRY_MS;
    const [downloadUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires: urlExpiresAt,
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
      urlExpiresAt,
      createdAt: Timestamp.now(),
    };
    await ref.set(stripUndefined(doc));
    return toFileDto(fileId, doc);
  },

  async findByIdRaw(
    userId: string,
    profileId: string,
    sessionId: string,
    fileId: string,
  ): Promise<FileDto | null> {
    const snap = await fileDoc(userId, profileId, sessionId, fileId).get();
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
    profileId: string,
    sessionId: string,
    fileId: string,
  ): Promise<FileDto | null> {
    const snap = await fileDoc(userId, profileId, sessionId, fileId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as FileDocument;

    // Refresh the signed URL so the caller always gets a valid link.
    const urlExpiresAt = Date.now() + SIGNED_URL_EXPIRY_MS;
    const gcsFile = bucket.file(doc.storagePath);
    const [freshUrl] = await gcsFile.getSignedUrl({
      action: "read",
      expires: urlExpiresAt,
    });
    await snap.ref.update({ downloadUrl: freshUrl, urlExpiresAt });

    return toFileDto(snap.id, { ...doc, downloadUrl: freshUrl, urlExpiresAt });
  },

  async list(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<FileDto[]> {
    const snap = await filesCol(userId, profileId, sessionId)
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

  /** Same as listAllForUser but without orderBy — avoids the composite index requirement. */
  async listAllForUserUnordered(userId: string): Promise<FileDto[]> {
    try {
      const snap = await db
        .collectionGroup("files")
        .where("userId", "==", userId)
        .get();
      const docs = snap.docs.map((d: QueryDocumentSnapshot) =>
        toFileDto(d.id, d.data() as FileDocument),
      );
      // Sort client-side so we don't require the composite index to be deployed
      return docs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (err) {
      // Firestore single-field collection-group index may not be deployed yet.
      // Return an empty list so the Files page degrades gracefully instead of 500.
      console.error(
        "[fileRepository.listAllForUserUnordered] query failed:",
        err,
      );
      return [];
    }
  },

  /** Delete GCS object and Firestore metadata. */
  async delete(
    userId: string,
    profileId: string,
    sessionId: string,
    fileId: string,
  ): Promise<void> {
    const snap = await fileDoc(userId, profileId, sessionId, fileId).get();
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

  /**
   * Aggregate total storage used by a user across all sessions.
   * Returns `usedBytes`, `fileCount`, and the per-user `limitBytes`.
   */
  async getStorageMetrics(userId: string): Promise<StorageMetricsDto> {
    try {
      const snap = await db
        .collectionGroup("files")
        .where("userId", "==", userId)
        .get();
      const usedBytes = snap.docs.reduce(
        (sum, d) => sum + ((d.data() as Pick<FileDocument, "size">).size ?? 0),
        0,
      );
      return {
        usedBytes,
        fileCount: snap.size,
        limitBytes: USER_STORAGE_LIMIT_BYTES,
      };
    } catch (err) {
      // Firestore collection-group index may not be deployed yet.
      // Return zeroed metrics so the API returns 200 instead of 500.
      console.error("[fileRepository.getStorageMetrics] query failed:", err);
      return {
        usedBytes: 0,
        fileCount: 0,
        limitBytes: USER_STORAGE_LIMIT_BYTES,
      };
    }
  },

  /** Patch arbitrary fields on an existing file document (e.g. extractedData). */
  async patch(
    userId: string,
    profileId: string,
    sessionId: string,
    fileId: string,
    data: Partial<Pick<FileDocument, "extractedData">>,
  ): Promise<void> {
    await fileDoc(userId, profileId, sessionId, fileId).update(
      data as Record<string, unknown>,
    );
  },

  /** Delete all files for a session (used when deleting the session). */
  async deleteAll(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<void> {
    const snap = await filesCol(userId, profileId, sessionId).get();
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
