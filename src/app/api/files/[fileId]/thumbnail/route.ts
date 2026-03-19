import { WithContext, ApiError } from "@/lib/api/with-context";
import { fileRepository } from "@/data/sessions/repositories/file.repository";
import { bucket } from "@/lib/firebase/admin";
import { generateThumbnail } from "@/data/sessions/service/thumbnail.service";

async function resolveThumbnailUrl(
  userId: string,
  profileId: string,
  fileId: string,
): Promise<string | null> {
  const url = await fileRepository.getThumbnailSignedUrl(profileId, fileId);
  if (url) return url;

  // Cross-profile: find the file, then get thumbnail from its actual profile.
  const file = await fileRepository.findByIdForUser(userId, fileId);
  if (!file) return null;
  const ownerProfileId = file.storagePath.split("/")[1];
  if (!ownerProfileId) return null;
  return fileRepository.getThumbnailSignedUrl(ownerProfileId, fileId);
}

/** Download original from GCS, regenerate thumbnail, persist, and return signed URL. */
async function regenerateThumbnail(
  userId: string,
  fileId: string,
): Promise<string | null> {
  const file = await fileRepository.findByIdForUser(userId, fileId);
  if (!file) return null;

  const ownerProfileId = file.storagePath.split("/")[1];
  if (!ownerProfileId) return null;

  const [contents] = await bucket.file(file.storagePath).download();
  const thumbBuffer = await generateThumbnail(contents, file.mimeType);
  if (!thumbBuffer) return null;

  await fileRepository.uploadThumbnail(ownerProfileId, fileId, thumbBuffer);
  return fileRepository.getThumbnailSignedUrl(ownerProfileId, fileId);
}

// GET /api/files/[fileId]/thumbnail — redirect to a fresh signed thumbnail URL
export const GET = WithContext<{ fileId: string }>(
  async ({ user, profileId }, { fileId }) => {
    const existing = await resolveThumbnailUrl(user.uid, profileId, fileId);
    const url = existing ?? (await regenerateThumbnail(user.uid, fileId));
    if (!url) throw ApiError.notFound("Thumbnail not found.");

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=600",
      },
    });
  },
);
