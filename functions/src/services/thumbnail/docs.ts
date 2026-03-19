import sharp from "sharp";
import { createCanvas } from "canvas";
import * as mammoth from "mammoth";
import ExcelJS from "exceljs";

// ── Constants ─────────────────────────────────────────────────────────────────

const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 560; // ~A4 aspect ratio
const THUMB_QUALITY = 80;
const PADDING = 24;
const LINE_HEIGHT = 16;
const FONT_SIZE = 12;
const HEADER_FONT_SIZE = 14;

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const PDF_TYPES = new Set(["application/pdf"]);
const WORD_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const EXCEL_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// ── API ───────────────────────────────────────────────────────────────────────

/** Returns true if the given MIME type is a supported document format. */
export function isDocument(type: string): boolean {
  return DOCUMENT_MIME_TYPES.has(type);
}

/** Generate a WebP thumbnail from a document buffer. */
export async function generate(buffer: Buffer, type: string): Promise<Buffer> {
  if (PDF_TYPES.has(type)) return generatePdfThumbnail(buffer);
  if (WORD_TYPES.has(type)) return generateWordThumbnail(buffer);
  if (EXCEL_TYPES.has(type)) return generateExcelThumbnail(buffer);
  throw new Error(`Unsupported document type: ${type}`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function generatePdfThumbnail(buffer: Buffer): Promise<Buffer> {
  // pdfjs-dist requires a dynamic import for the Node.js (legacy) build
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true })
    .promise;
  const page = await doc.getPage(1);

  // Scale page to fit THUMB_WIDTH
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = THUMB_WIDTH / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  // pdfjs render expects a CanvasRenderingContext2D-compatible object
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    canvas: canvas as unknown as HTMLCanvasElement,
    viewport,
  }).promise;

  const pngBuffer = canvas.toBuffer("image/png");
  return sharp(pngBuffer).webp({ quality: THUMB_QUALITY }).toBuffer();
}

// ── Word (DOCX) ───────────────────────────────────────────────────────────────

async function generateWordThumbnail(buffer: Buffer): Promise<Buffer> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  return renderTextThumbnail(text);
}

// ── Excel (XLS/XLSX) ──────────────────────────────────────────────────────────

async function generateExcelThumbnail(buffer: Buffer): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return renderTextThumbnail("(Empty spreadsheet)");
  return renderTableThumbnail(sheet);
}

// ── Renderers ─────────────────────────────────────────────────────────────────

/** Render plain text onto a canvas — used for Word docs. */
function renderTextThumbnail(text: string): Promise<Buffer> {
  const canvas = createCanvas(THUMB_WIDTH, THUMB_HEIGHT);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);

  // Text styling
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `${FONT_SIZE}px sans-serif`;

  const maxWidth = THUMB_WIDTH - PADDING * 2;
  const lines = wrapText(ctx, text, maxWidth);
  const maxLines = Math.floor((THUMB_HEIGHT - PADDING * 2) / LINE_HEIGHT);

  let y = PADDING + FONT_SIZE;
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    ctx.fillText(lines[i], PADDING, y);
    y += LINE_HEIGHT;
  }

  const pngBuffer = canvas.toBuffer("image/png");
  return sharp(pngBuffer).webp({ quality: THUMB_QUALITY }).toBuffer();
}

/** Render a spreadsheet as a table on canvas. */
function renderTableThumbnail(sheet: ExcelJS.Worksheet): Promise<Buffer> {
  const canvas = createCanvas(THUMB_WIDTH, THUMB_HEIGHT);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);

  const maxCols = Math.min(sheet.columnCount, 6);
  const maxRows = Math.min(sheet.rowCount, 30);
  const colWidth = (THUMB_WIDTH - PADDING * 2) / maxCols;
  const rowHeight = LINE_HEIGHT + 4;

  let y = PADDING;

  for (let r = 1; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    if (y + rowHeight > THUMB_HEIGHT - PADDING) break;

    // Header row styling
    const isHeader = r === 1;
    ctx.font = isHeader
      ? `bold ${HEADER_FONT_SIZE}px sans-serif`
      : `${FONT_SIZE}px sans-serif`;
    ctx.fillStyle = "#1a1a1a";

    for (let c = 1; c <= maxCols; c++) {
      const cell = row.getCell(c);
      const value = cell.text || "";
      const x = PADDING + (c - 1) * colWidth;

      // Truncate text to fit column
      const maxTextWidth = colWidth - 8;
      let displayText = value;
      while (
        ctx.measureText(displayText).width > maxTextWidth &&
        displayText.length > 1
      ) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText.length < value.length) displayText += "…";

      ctx.fillText(displayText, x + 4, y + FONT_SIZE);
    }

    // Draw row separator
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, y + rowHeight);
    ctx.lineTo(THUMB_WIDTH - PADDING, y + rowHeight);
    ctx.stroke();

    y += rowHeight;
  }

  // Draw column separators
  ctx.strokeStyle = "#e0e0e0";
  for (let c = 1; c < maxCols; c++) {
    const x = PADDING + c * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, PADDING);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  const pngBuffer = canvas.toBuffer("image/png");
  return sharp(pngBuffer).webp({ quality: THUMB_QUALITY }).toBuffer();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Word-wrap text to fit within maxWidth on the given canvas context. */
function wrapText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}
