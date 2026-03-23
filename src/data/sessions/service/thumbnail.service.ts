import sharp from "sharp";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Max width for generated thumbnails (height scales proportionally). */
const THUMB_WIDTH = 400;

/** WebP quality (0–100). 80 is a good balance of quality vs size. */
const THUMB_QUALITY = 80;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Generates a WebP thumbnail from the raw file buffer.
 * Returns `null` for non-image file types (PDF, Word) — the UI already
 * renders styled icon placeholders for those.
 */
export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
): Promise<Buffer | null> {
  if (!IMAGE_MIME_TYPES.has(mimeType)) return null;

  return sharp(buffer)
    .rotate() // auto-orient based on EXIF
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}
