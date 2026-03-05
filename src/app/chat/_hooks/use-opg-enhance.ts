"use client";

/**
 * OPG / dental X-ray auto-enhancement.
 *
 * Pipeline (runs entirely in the browser via Canvas API):
 *  1. Decode image into an ImageData buffer.
 *  2. Detect whether the image is greyscale-dominant (≥ 80% pixels are near-grey).
 *     – Only greyscale / near-greyscale images (X-rays, radiographs) are enhanced.
 *     – Colour photos are returned unchanged.
 *  3. Convert to luminance array and compute the 1st / 99th percentile values
 *     (clip-limit histogram stretch — a simplified CLAHE pass).
 *  4. Apply per-pixel contrast stretch so the clipped range fills 0–255.
 *  5. Apply a mild unsharp-mask (sharpening) pass using a 3×3 Gaussian blur
 *     difference to accentuate margin edges.
 *  6. Encode back to the original MIME type and return as a new File.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fraction of pixels used as clip limit for histogram stretch (both tails). */
const CLIP = 0.01; // 1 %

/** Unsharp-mask strength — 0 = none, 1 = strong. */
const UNSHARP_AMOUNT = 0.45;

/** Radius of the Gaussian blur used for unsharp masking (pixels). */
const UNSHARP_RADIUS = 1;

/** Fraction of pixels that must be "near-grey" for the image to qualify. */
const GREYSCALE_THRESHOLD = 0.75;

/** Max colour channel difference to consider a pixel "near-grey". */
const GREY_TOLERANCE = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Draw a File/Blob as an ImageData on an OffscreenCanvas (or regular Canvas). */
function decodeToImageData(
  file: File,
): Promise<{ data: ImageData; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ data: ctx.getImageData(0, 0, w, h), w, h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}

/** Encode ImageData back to a File blob. */
function encodeToFile(
  data: ImageData,
  w: number,
  h: number,
  originalFile: File,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("No 2d context"));
      return;
    }
    ctx.putImageData(data, 0, 0);
    const mime = originalFile.type || "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("toBlob failed"));
          return;
        }
        resolve(
          new File([blob], originalFile.name, {
            type: mime,
            lastModified: Date.now(),
          }),
        );
      },
      mime,
      0.95,
    );
  });
}

/** Check whether at least GREYSCALE_THRESHOLD of pixels are near-grey. */
function isGreyscaleDominant(pixels: Uint8ClampedArray): boolean {
  const total = pixels.length / 4;
  let greyCount = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    if (maxC - minC < GREY_TOLERANCE) greyCount++;
  }
  return greyCount / total >= GREYSCALE_THRESHOLD;
}

/** Compute Nth percentile from a 256-bucket histogram. */
function percentile(hist: Uint32Array, totalPixels: number, p: number): number {
  const target = Math.floor(p * totalPixels);
  let cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += hist[v];
    if (cumulative >= target) return v;
  }
  return 255;
}

/** Build a 256-bucket luminance histogram from RGBA pixel data. */
function buildHistogram(pixels: Uint8ClampedArray): Uint32Array {
  const hist = new Uint32Array(256);
  for (let i = 0; i < pixels.length; i += 4) {
    // ITU-R BT.709 luminance
    const lum = Math.round(
      0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2],
    );
    hist[lum]++;
  }
  return hist;
}

/** Apply contrast stretch: map [lo, hi] → [0, 255] per channel (preserving hue). */
function applyContrastStretch(
  pixels: Uint8ClampedArray,
  lo: number,
  hi: number,
): void {
  if (hi === lo) return; // flat image — nothing to do
  const scale = 255 / (hi - lo);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.min(255, Math.max(0, (pixels[i] - lo) * scale));
    pixels[i + 1] = Math.min(255, Math.max(0, (pixels[i + 1] - lo) * scale));
    pixels[i + 2] = Math.min(255, Math.max(0, (pixels[i + 2] - lo) * scale));
    // alpha (i+3) left untouched
  }
}

/**
 * Box-blur (approximates Gaussian) — used only for unsharp masking.
 * Returns a new Uint8ClampedArray with the blurred channel data.
 */
function boxBlur(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const r = Math.max(1, radius);
  const stride = w * 4;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const idx = ny * stride + nx * 4;
          sumR += pixels[idx];
          sumG += pixels[idx + 1];
          sumB += pixels[idx + 2];
          count++;
        }
      }
      const oi = y * stride + x * 4;
      out[oi] = sumR / count;
      out[oi + 1] = sumG / count;
      out[oi + 2] = sumB / count;
      out[oi + 3] = pixels[oi + 3];
    }
  }
  return out;
}

/** Apply unsharp-mask: sharpened = original + amount × (original − blur). */
function applyUnsharpMask(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): void {
  const blurred = boxBlur(pixels, w, h, UNSHARP_RADIUS);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.min(
      255,
      Math.max(0, pixels[i] + UNSHARP_AMOUNT * (pixels[i] - blurred[i])),
    );
    pixels[i + 1] = Math.min(
      255,
      Math.max(
        0,
        pixels[i + 1] + UNSHARP_AMOUNT * (pixels[i + 1] - blurred[i + 1]),
      ),
    );
    pixels[i + 2] = Math.min(
      255,
      Math.max(
        0,
        pixels[i + 2] + UNSHARP_AMOUNT * (pixels[i + 2] - blurred[i + 2]),
      ),
    );
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enhance a single image file using auto-contrast stretch + unsharp mask.
 *
 * Returns:
 *  - The enhanced `File`  (if the image is greyscale-dominant, i.e. likely an X-ray).
 *  - The **original** `File` unchanged (if colour-dominant or non-image).
 *
 * Never throws — any error falls back to the original file.
 */
export async function enhanceXrayImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // PDFs are skipped — Gemini reads them natively; canvas can't decode arbitrary PDFs.
  if (file.type === "application/pdf") return file;

  try {
    const { data, w, h } = await decodeToImageData(file);
    const px = data.data;

    if (!isGreyscaleDominant(px)) return file; // colour photo — skip

    // ── Pass 1: histogram-stretch auto-contrast ──────────────────────────────
    const hist = buildHistogram(px);
    const totalPixels = w * h;
    const lo = percentile(hist, totalPixels, CLIP);
    const hi = percentile(hist, totalPixels, 1 - CLIP);
    applyContrastStretch(px, lo, hi);

    // ── Pass 2: unsharp mask (edge accentuation) ─────────────────────────────
    applyUnsharpMask(px, w, h);

    return await encodeToFile(data, w, h, file);
  } catch {
    // Non-fatal — always fall back to original
    return file;
  }
}
