import { isImage, generate as generateImage } from "./image.js";

// Placeholder thumbnail URLs for document types that don't get real thumbnails.
const PLACEHOLDER_THUMBNAILS: Record<string, string> = {
  "application/pdf": "https://img.icons8.com/fluency/400/pdf.png",
  "application/msword": "https://img.icons8.com/fluency/400/word.png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "https://img.icons8.com/fluency/400/word.png",
  "application/vnd.ms-excel":
    "https://img.icons8.com/fluency/400/microsoft-excel-2019.png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "https://img.icons8.com/fluency/400/microsoft-excel-2019.png",
};

export type ThumbnailResult =
  | { type: "buffer"; data: Buffer }
  | { type: "url"; url: string }
  | null;

/**
 * Download a file from the given URL and generate a thumbnail.
 * - Images: generates a WebP thumbnail buffer.
 * - Documents (PDF, Word, Excel): returns a placeholder icon URL.
 * - Other types: returns null.
 */
export async function generate(
  url: string,
  mimeType: string,
): Promise<ThumbnailResult> {
  // Documents get a static placeholder — no rendering needed.
  const placeholder = PLACEHOLDER_THUMBNAILS[mimeType];
  if (placeholder) return { type: "url", url: placeholder };

  // Images get a real WebP thumbnail.
  if (isImage(mimeType)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { type: "buffer", data: await generateImage(buffer) };
  }

  return null;
}
