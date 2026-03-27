import type { FileLabel } from "@/data/files";
import type { UIMessage } from "ai";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageContext {
  /** Session title derived from the first non-welcome message (≤60 chars). */
  title: string;
  /** Last user message text — used for RAG semantic search and gateway routing. */
  userQuery: string;
  /** Last user message parts with file/image blobs replaced by signed URLs (storable in Firestore). */
  storableParts: Array<Record<string, unknown>>;
  /** Whether the last user message contains file/image attachments. */
  hasAttachment: boolean;
}

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Extracts all context needed from the messages array for the chat route.
 *
 * - `title`        — first non-welcome message text, capped at 60 chars (session naming)
 * - `userQuery`    — last user message text (for RAG + gateway routing)
 * - `storableParts`— last user message parts with file blobs replaced by signed URLs
 * - `hasAttachment`— whether the last user message includes a file or image
 */
export function extractMessageContext(
  messages: UIMessage[],
  attachmentUrls?: Array<{
    fileId?: string;
    url: string;
    mediaType: string;
    fileName?: string;
    label?: FileLabel;
  }>,
): MessageContext {
  const title = (extractFirstText(messages) ?? "New Session").slice(0, 60);

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastUserParts =
    lastUserMsg?.parts.filter((p) => p.type !== "tool-result") ?? [];

  const userQuery =
    extractTextFromParts(lastUserParts) ?? "general health inquiry";
  const storableParts = buildStorableParts(lastUserParts, attachmentUrls);
  const hasAttachment = lastUserParts.some((p) => {
    const t = p.type as string;
    return t === "file" || t === "image";
  });

  return { title, userQuery, storableParts, hasAttachment };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the text content of the first meaningful message (user or AI)
 * for use as the session title. The welcome message (id="welcome") is excluded.
 */
export function extractFirstText(messages: UIMessage[]): string | null {
  for (const msg of messages) {
    if (msg.id === "welcome") continue;
    for (const part of msg.parts ?? []) {
      if (part.type === "text" && "text" in part && part.text) {
        return part.text;
      }
    }
  }
  return null;
}

/** Extracts the first text content from a list of message parts. */
function extractTextFromParts(
  parts: ReadonlyArray<{ type: string; [key: string]: unknown }>,
): string | null {
  for (const part of parts) {
    if (part.type === "text" && typeof part.text === "string" && part.text) {
      return part.text;
    }
  }
  return null;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeUntilStable(value: string, maxIterations = 3): string {
  let current = value;
  for (let i = 0; i < maxIterations; i++) {
    const decoded = decodeURIComponentSafe(current);
    if (decoded === current) return current;
    current = decoded;
  }
  return current;
}

function normalizeGsUrl(url: string): string {
  if (!url.startsWith("gs://")) return url;
  const withoutScheme = url.slice("gs://".length);
  const slashIdx = withoutScheme.indexOf("/");
  if (slashIdx < 0) return url;

  const bucket = withoutScheme.slice(0, slashIdx);
  const objectPath = withoutScheme.slice(slashIdx + 1);
  const normalizedPath = decodeUntilStable(objectPath);
  return `gs://${bucket}/${normalizedPath}`;
}

function getNormalizedExistingAttachmentPart(
  part: Record<string, unknown>,
  existingUrl: string,
): Record<string, unknown> {
  return {
    type: "file",
    ...(typeof part.fileId === "string" ? { fileId: part.fileId } : {}),
    url: normalizeGsUrl(existingUrl),
    mediaType: (part.mediaType as string) || "application/octet-stream",
    ...(typeof part.fileName === "string" ? { fileName: part.fileName } : {}),
    ...(typeof part.label === "string" ? { label: part.label } : {}),
  };
}

function getAttachmentReferencePart(attachment: {
  fileId?: string;
  url: string;
  mediaType: string;
  fileName?: string;
  label?: FileLabel;
}): Record<string, unknown> {
  return {
    type: "file",
    ...(attachment.fileId ? { fileId: attachment.fileId } : {}),
    url: attachment.url,
    mediaType: attachment.mediaType,
    ...(attachment.fileName ? { fileName: attachment.fileName } : {}),
    ...(attachment.label ? { label: attachment.label } : {}),
  };
}

function getMissingAttachmentFallback(
  part: Record<string, unknown>,
): Record<string, unknown> {
  console.error(
    "[Chat] Missing attachment URL — client must upload files before sending.",
  );
  return {
    type: "text",
    text: `[Attached: ${(part.mediaType as string) || (part.mimeType as string) || "file"}]`,
  };
}

/**
 * Replaces file/image parts with storable URL references from attachmentUrls.
 * Non-file parts are passed through unchanged.
 *
 * File parts that already carry an HTTP(S) URL or GCS URI (uploaded by the
 * client before sending) are preserved directly — no attachmentUrls lookup
 * needed.
 * Legacy flow: base64/blob file parts are matched to `attachmentUrls` by order.
 */
function buildStorableParts(
  parts: ReadonlyArray<Record<string, unknown>>,
  attachmentUrls?: Array<{
    fileId?: string;
    url: string;
    mediaType: string;
    fileName?: string;
    label?: FileLabel;
  }>,
): Array<Record<string, unknown>> {
  let attachIdx = 0;
  return parts.map((p) => {
    const t = p.type as string;
    if (t !== "file" && t !== "image") return p;

    // File part already has an HTTP URL or GCS URI (uploaded before
    // sendMessage) — keep it.
    const existingUrl = p.url as string | undefined;
    if (
      existingUrl &&
      (existingUrl.startsWith("http") || existingUrl.startsWith("gs://"))
    ) {
      return getNormalizedExistingAttachmentPart(p, existingUrl);
    }

    const attach = attachmentUrls?.[attachIdx++];
    if (attach) {
      return getAttachmentReferencePart(attach);
    }
    return getMissingAttachmentFallback(p);
  });
}
