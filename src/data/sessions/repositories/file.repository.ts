import {
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db, bucket } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import type {
  FileDocument,
  FileDto,
  StorageMetricsDto,
} from "../models/file.model";
import { toFileDto, USER_STORAGE_LIMIT_BYTES } from "../models/file.model";

// ── Path helpers ─────────────────────────────────────────────────────────────
// Flat collection: profiles/{profileId}/files/{fileId}

const filesCol = (profileId: string) =>
  db.collection(`profiles/${profileId}/files`);

const fileDoc = (profileId: string, fileId: string) =>
  filesCol(profileId).doc(fileId);

/** GCS object path for a file */
const gcStoragePath = (profileId: string, fileId: string, name: string) =>
  `profiles/${profileId}/files/${fileId}/${name}`;

/** GCS object path for a thumbnail */
const gcThumbnailPath = (profileId: string, fileId: string) =>
  `profiles/${profileId}/files/${fileId}/thumb.webp`;

/** Signed URL expiry — 7 days (GCS maximum for service-account-signed URLs). */
const SIGNED_URL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ── Repository ────────────────────────────────────────────────────────────────

export const fileRepository = {
  /**
   * Upload `buffer` to GCS and persist metadata to Firestore.
   * Returns the new FileDto with a fresh signed download URL.
   */
  async upload(
    userId: string,
    profileId: string,
    data: Pick<FileDocument, "name" | "mimeType" | "size"> & {
      buffer: Buffer;
      sessionId?: string;
    },
  ): Promise<FileDto> {
    // 1. Reserve a Firestore doc ID so we can embed it in the storage path.
    const ref = filesCol(profileId).doc();
    const fileId = ref.id;
    const gcsPath = gcStoragePath(profileId, fileId, data.name);

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
      sessionId: data.sessionId,
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

  /** Get file metadata without refreshing the signed URL. */
  async findByIdRaw(
    profileId: string,
    fileId: string,
  ): Promise<FileDto | null> {
    const snap = await fileDoc(profileId, fileId).get();
    if (!snap.exists) return null;
    return toFileDto(snap.id, snap.data() as FileDocument);
  },

  /**
   * Find a file by ID for a user across ALL profiles (collectionGroup).
   * Use this when the profileId is unknown.
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

  /** Get file metadata and refresh the signed URL. */
  async findById(profileId: string, fileId: string): Promise<FileDto | null> {
    const snap = await fileDoc(profileId, fileId).get();
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

  /**
   * List files for a profile. Optionally filter by `sessionId` tag.
   */
  async list(profileId: string, sessionId?: string): Promise<FileDto[]> {
    let query: Query = filesCol(profileId);
    if (sessionId) {
      query = query.where("sessionId", "==", sessionId);
    }
    query = query.orderBy("createdAt", "asc");
    const snap = await query.get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toFileDto(d.id, d.data() as FileDocument),
    );
  },

  /** List all files for a user across every profile, newest first. */
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

  /** Same as listAllForUser but sorts client-side — avoids the composite index requirement. */
  async listAllForUserUnordered(userId: string): Promise<FileDto[]> {
    try {
      const snap = await db
        .collectionGroup("files")
        .where("userId", "==", userId)
        .get();
      const docs = snap.docs.map((d: QueryDocumentSnapshot) =>
        toFileDto(d.id, d.data() as FileDocument),
      );
      return docs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (err) {
      console.error(
        "[fileRepository.listAllForUserUnordered] query failed:",
        err,
      );
      return [];
    }
  },

  /** Delete GCS object, thumbnail, and Firestore metadata. */
  async delete(profileId: string, fileId: string): Promise<void> {
    const snap = await fileDoc(profileId, fileId).get();
    if (!snap.exists) return;
    const doc = snap.data() as FileDocument;

    try {
      await bucket.file(doc.storagePath).delete();
    } catch {
      /* file may already be deleted */
    }
    if (doc.thumbnailPath) {
      try {
        await bucket.file(doc.thumbnailPath).delete();
      } catch {
        /* thumbnail may already be deleted */
      }
    }

    await snap.ref.delete();
  },

  /**
   * Aggregate total storage used by a user across all profiles.
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
      console.error("[fileRepository.getStorageMetrics] query failed:", err);
      return {
        usedBytes: 0,
        fileCount: 0,
        limitBytes: USER_STORAGE_LIMIT_BYTES,
      };
    }
  },

  /** Patch arbitrary fields on an existing file document (e.g. extractedData, label, thumbnailPath). */
  async patch(
    profileId: string,
    fileId: string,
    data: Partial<
      Pick<FileDocument, "extractedData" | "label" | "labelConfidence" | "thumbnailPath">
    >,
  ): Promise<void> {
    await fileDoc(profileId, fileId).update(data as Record<string, unknown>);
  },

  /**
   * Upload a thumbnail buffer to GCS and patch the Firestore doc with the path.
   * Returns the GCS object path.
   */
  async uploadThumbnail(
    profileId: string,
    fileId: string,
    buffer: Buffer,
  ): Promise<string> {
    const thumbPath = gcThumbnailPath(profileId, fileId);
    const gcsFile = bucket.file(thumbPath);
    await gcsFile.save(buffer, {
      contentType: "image/webp",
      metadata: { cacheControl: "private, max-age=31536000" },
    });
    await fileDoc(profileId, fileId).update({ thumbnailPath: thumbPath });
    return thumbPath;
  },

  /** Generate a fresh signed URL for a file's thumbnail. */
  async getThumbnailSignedUrl(
    profileId: string,
    fileId: string,
  ): Promise<string | null> {
    const snap = await fileDoc(profileId, fileId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as FileDocument;
    if (!doc.thumbnailPath) return null;

    const gcsFile = bucket.file(doc.thumbnailPath);
    const [url] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    return url;
  },

  /** Delete all files tagged with a given sessionId (used when deleting a chat session). */
  async deleteAll(profileId: string, sessionId: string): Promise<void> {
    const snap = await filesCol(profileId)
      .where("sessionId", "==", sessionId)
      .get();
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
