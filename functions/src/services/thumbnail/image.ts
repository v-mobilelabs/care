import sharp from "sharp";

// ── Constants ─────────────────────────────────────────────────────────────────

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);

// ── API ───────────────────────────────────────────────────────────────────────

/** Returns true if the given MIME type is a supported image format. */
export function isImage(type: string): boolean {
  return IMAGE_MIME_TYPES.has(type);
}

/** Resize an image buffer to a 400px-wide WebP thumbnail. */
export async function generate(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // auto-orient based on EXIF
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}
