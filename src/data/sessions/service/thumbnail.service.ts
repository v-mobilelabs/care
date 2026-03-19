import sharp from "sharp";
import { pdf } from "pdf-to-img";

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
 * Renders page 1 of a PDF to a PNG buffer using pdf-to-img (pdfjs-dist).
 */
async function renderPdfPage1(buffer: Buffer): Promise<Buffer> {
  const doc = await pdf(buffer, { scale: 2 });
  const page = await doc.getPage(1);
  return Buffer.from(page);
}

/**
 * Generates a WebP thumbnail from the raw file buffer.
 * Supports images (JPEG, PNG, GIF, WebP, HEIC) and PDFs (renders page 1).
 * Returns `null` for unsupported file types (Word, etc.).
 */
export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
): Promise<Buffer | null> {
  let imageBuffer: Buffer;

  if (mimeType === "application/pdf") {
    imageBuffer = await renderPdfPage1(buffer);
  } else if (IMAGE_MIME_TYPES.has(mimeType)) {
    imageBuffer = buffer;
  } else {
    return null;
  }

  return sharp(imageBuffer)
    .rotate() // auto-orient based on EXIF
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}
