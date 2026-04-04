import {
  AggregateField,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { db, bucket } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import type {
  FileDocument,
  FileDto,
  PaginatedFiles,
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
const gcStoragePath = (profileId: string, fileId: string, objectName: string) =>
  `profiles/${profileId}/files/${fileId}/${objectName}`;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

const MIME_FILTER_MAP: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"],
  pdf: ["application/pdf"],
  word: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

function buildStorageObjectName(mime: string): string {
  const extension = MIME_EXTENSION_MAP[mime] ?? "bin";
  return `${randomUUID()}.${extension}`;
}

/** GCS object path for a thumbnail */
const gcThumbnailPath = (profileId: string, fileId: string) =>
  `profiles/${profileId}/files/${fileId}/thumb.webp`;

/** Signed URL expiry — 7 days (GCS maximum for service-account-signed URLs). */
const SIGNED_URL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function applyMimeTypeFilter(base: Query, mime?: string): Query {
  if (!mime) return base;

  const mimes = MIME_FILTER_MAP[mime];
  if (mimes?.length === 1) {
    return base.where("mime", "==", mimes[0]);
  }
  if (mimes && mimes.length > 1) {
    return base.where("mime", "in", mimes);
  }
  return base;
}

function applyListFilters(
  base: Query,
  opts: { label?: string; mime?: string },
): Query {
  let query = base;
  if (opts.label) {
    query = query.where("label", "==", opts.label);
  }
  return applyMimeTypeFilter(query, opts.mime);
}

// ── Repository ────────────────────────────────────────────────────────────────

export const fileRepository = {
  /**
   * Upload `buffer` to GCS and persist metadata to Firestore.
   * Returns the new FileDto with a fresh signed download URL.
   */
  async upload(
    userId: string,
    profileId: string,
    data: Pick<FileDocument, "mime" | "size"> & {
      buffer: Buffer;
      sourceId?: string;
    },
  ): Promise<FileDto> {
    // 1. Reserve a Firestore doc ID so we can embed it in the storage path.
    const ref = filesCol(profileId).doc();
    const fileId = ref.id;
    const objectName = buildStorageObjectName(data.mime);
    const gcsPath = gcStoragePath(profileId, fileId, objectName);

    // 2. Upload to Cloud Storage.
    const gcsFile = bucket.file(gcsPath);
    const t1 = performance.now();
    await gcsFile.save(data.buffer, {
      contentType: data.mime,
      resumable: data.buffer.length < 5 * 1024 * 1024, // skip resumable initiation for files < 5 MB
      metadata: { cacheControl: "private, max-age=31536000" },
    });
    console.log(
      `[fileRepository.upload] GCS save: ${Math.round(performance.now() - t1)}ms`,
    );

    // 3. Write Firestore metadata.
    // Signed URL is deferred — toFileDto maps downloadUrl to a proxy route
    // (/api/files/:id) which generates a fresh signed URL on access.
    const t3 = performance.now();
    const doc: FileDocument = {
      userId,
      label: "other", // Default label — will be updated by async classification
      sourceId: data.sourceId,
      path: gcsPath,
      mime: data.mime,
      size: data.size,
    };
    await ref.set(stripUndefined(doc));
    console.log(
      `[fileRepository.upload] Firestore set: ${Math.round(performance.now() - t3)}ms`,
    );
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

    // Signed URL is always generated fresh by the proxy route
    // No need to store or refresh it in Firestore
    return toFileDto(snap.id, doc);
  },

  /**
   * List files for a profile. Optionally filter by `sourceId` tag.
   */
  async list(profileId: string, sourceId?: string): Promise<FileDto[]> {
    let query: Query = filesCol(profileId);
    if (sourceId) {
      query = query.where("sourceId", "==", sourceId);
    }
    const snap = await query.get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toFileDto(d.id, d.data() as FileDocument),
    );
  },

  /** List all files for a user across every profile. */
  async listAllForUser(userId: string): Promise<FileDto[]> {
    const snap = await db
      .collectionGroup("files")
      .where("userId", "==", userId)
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
      // Sort by document ID (which is time-sortable) for deterministic ordering
      return docs.sort((a, b) => b.id.localeCompare(a.id));
    } catch (err) {
      console.error(
        "[fileRepository.listAllForUserUnordered] query failed:",
        err,
      );
      return [];
    }
  },

  /**
   * Paginated listing of files for a single profile.
   * Supports server-side filtering by label and mime prefix,
   * client-side path search (q), and cursor-based pagination.
   */
  async listPaginated(
    profileId: string,
    opts: {
      limit: number;
      cursor?: string;
      label?: string;
      mime?: string;
      q?: string;
      sortDir?: "asc" | "desc";
    },
  ): Promise<PaginatedFiles> {
    let query: Query = applyListFilters(filesCol(profileId), {
      label: opts.label,
      mime: opts.mime,
    });

    const sortDir = opts.sortDir ?? "desc";
    query = query.orderBy("__name__", sortDir);

    if (opts.cursor) {
      query = query.startAfter(opts.cursor);
    }

    // When a search term is present, we fetch more to compensate for client-side filtering
    const fetchLimit = opts.q ? (opts.limit + 1) * 3 : opts.limit + 1;
    const snap = await query.limit(fetchLimit).get();
    let docs = snap.docs.map((d: QueryDocumentSnapshot) =>
      toFileDto(d.id, d.data() as FileDocument),
    );

    // Client-side path search (Firestore can't do substring match)
    if (opts.q) {
      const term = opts.q.toLowerCase();
      docs = docs.filter((f) => f.path.toLowerCase().includes(term));
    }

    const hasMore = docs.length > opts.limit;
    const page = hasMore ? docs.slice(0, opts.limit) : docs;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Count total matching docs only on the first page (no cursor)
    let totalCount: number | undefined;
    if (!opts.cursor) {
      const cq = applyListFilters(filesCol(profileId), {
        label: opts.label,
        mime: opts.mime,
      });
      const countSnap = await cq.count().get();
      totalCount = countSnap.data().count;
    }

    return { files: page, nextCursor, totalCount };
  },

  /** Delete GCS object and Firestore metadata. */
  async delete(profileId: string, fileId: string): Promise<void> {
    const snap = await fileDoc(profileId, fileId).get();
    if (!snap.exists) return;
    const doc = snap.data() as FileDocument;

    try {
      await bucket.file(doc.path).delete();
    } catch {
      /* file may already be deleted */
    }

    await snap.ref.delete();
  },

  /**
   * Aggregate total storage used by a user across all profiles.
   * Returns `usedBytes`, `fileCount`, and the per-user `limitBytes`.
   */
  async getStorageMetrics(userId: string): Promise<StorageMetricsDto> {
    try {
      const t0 = performance.now();
      const baseQuery = db
        .collectionGroup("files")
        .where("userId", "==", userId);

      const [countSnap, sumSnap] = await Promise.all([
        baseQuery.count().get(),
        baseQuery.aggregate({ usedBytes: AggregateField.sum("size") }).get(),
      ]);

      console.log(
        `[fileRepository.getStorageMetrics] Aggregate queries: ${Math.round(performance.now() - t0)}ms`,
      );

      return {
        usedBytes: sumSnap.data().usedBytes ?? 0,
        fileCount: countSnap.data().count,
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

  /** Patch arbitrary fields on an existing file document (e.g. label, data). */
  async patch(
    profileId: string,
    fileId: string,
    data: Partial<Pick<FileDocument, "label" | "data">>,
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
    // Thumbnail path is stored in data field now, not as separate document field
    return thumbPath;
  },

  /** Generate a fresh signed URL for a file's thumbnail. */
  async getThumbnailSignedUrl(
    profileId: string,
    fileId: string,
  ): Promise<string | null> {
    const thumbPath = gcThumbnailPath(profileId, fileId);
    const [exists] = await bucket.file(thumbPath).exists();
    if (!exists) return null;

    const [url] = await bucket.file(thumbPath).getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    return url;
  },

  /** Delete all files tagged with a given sourceId (used when deleting a chat session). */
  async deleteAll(profileId: string, sourceId: string): Promise<void> {
    const snap = await filesCol(profileId)
      .where("sourceId", "==", sourceId)
      .get();
    const batch = db.batch();

    await Promise.all(
      snap.docs.map(async (d: QueryDocumentSnapshot) => {
        const doc = d.data() as FileDocument;
        try {
          await bucket.file(doc.path).delete();
        } catch {
          /* ignore */
        }
        batch.delete(d.ref);
      }),
    );

    await batch.commit();
  },
};
