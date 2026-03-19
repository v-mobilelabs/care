import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { generate } from "./services/thumbnail/thumbnail.js";

initializeApp();

const db = getFirestore();
const bucket = getStorage().bucket();

/** GCS object path for a thumbnail */
const gcThumbnailPath = (profileId: string, fileId: string) =>
  `profiles/${profileId}/files/${fileId}/thumb.webp`;

/**
 * Triggered when a new file document is created in profiles/{profileId}/files/{fileId}.
 * Downloads the original file, generates a WebP thumbnail, uploads it to GCS,
 * and patches the Firestore doc with the thumbnailPath.
 */
export const generateThumbnail = onDocumentCreated(
  "profiles/{profileId}/files/{fileId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const profileId = event.params.profileId;
    const fileId = event.params.fileId;
    const downloadUrl = data.downloadUrl as string | null;
    const mimeType = data.mimeType as string;

    if (!downloadUrl) {
      logger.warn("No downloadUrl on file document, skipping thumbnail.", {
        profileId,
        fileId,
      });
      return;
    }

    try {
      const thumbBuffer = await generate(downloadUrl, mimeType);
      if (!thumbBuffer) {
        logger.info("Unsupported file type for thumbnail, skipping.", {
          profileId,
          fileId,
          mimeType,
        });
        return;
      }

      // Upload thumbnail to GCS
      const thumbPath = gcThumbnailPath(profileId, fileId);
      const gcsFile = bucket.file(thumbPath);
      await gcsFile.save(thumbBuffer, {
        contentType: "image/webp",
        metadata: { cacheControl: "private, max-age=31536000" },
      });

      // Patch Firestore doc with thumbnail path
      await db
        .doc(`profiles/${profileId}/files/${fileId}`)
        .update({ thumbnailPath: thumbPath });

      logger.info("Thumbnail generated successfully.", {
        profileId,
        fileId,
        thumbPath,
      });
    } catch (err) {
      logger.error("Failed to generate thumbnail.", {
        profileId,
        fileId,
        mimeType,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
);
