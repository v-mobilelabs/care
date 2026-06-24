import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {
  initializeFirebase,
  getFirestoreInstance,
  getStorageInstance,
  logFirebaseStatus,
} from "./lib/firebase-admin.js";
import { generate } from "./services/thumbnail/thumbnail.js";
import { api } from "./server.js";

// Initialize Firebase Admin SDK on startup
initializeFirebase();
logFirebaseStatus();

const db = getFirestoreInstance();
const bucket = getStorageInstance().bucket();

/** GCS object path for a thumbnail */
const gcThumbnailPath = (profileId: string, fileId: string) =>
  `profiles/${profileId}/files/${fileId}/thumb.webp`;

/**
 * Triggered when a new file document is created in profiles/{profileId}/files/{fileId}.
 * - Images: generates a WebP thumbnail, uploads to GCS, saves thumbnailPath.
 * - Documents: saves a placeholder thumbnail URL directly.
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
      const result = await generate(downloadUrl, mimeType);
      if (!result) {
        logger.info("Unsupported file type for thumbnail, skipping.", {
          profileId,
          fileId,
          mimeType,
        });
        return;
      }

      if (result.type === "buffer") {
        // Upload generated thumbnail to GCS
        const thumbPath = gcThumbnailPath(profileId, fileId);
        const gcsFile = bucket.file(thumbPath);
        await gcsFile.save(result.data, {
          contentType: "image/webp",
          metadata: { cacheControl: "private, max-age=31536000" },
        });

        await db
          .doc(`profiles/${profileId}/files/${fileId}`)
          .update({ thumbnailPath: thumbPath });

        logger.info("Thumbnail generated and uploaded.", {
          profileId,
          fileId,
          thumbPath,
        });
      } else {
        // Store placeholder URL directly on the document
        await db
          .doc(`profiles/${profileId}/files/${fileId}`)
          .update({ thumbnailUrl: result.url });

        logger.info("Placeholder thumbnail URL saved.", {
          profileId,
          fileId,
          mimeType,
        });
      }
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

// Export HTTP API endpoints
export { api };
