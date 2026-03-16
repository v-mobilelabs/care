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
  attachmentUrls?: Array<{ url: string; mediaType: string }>,
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

/**
 * Replaces file/image parts with storable URL references from attachmentUrls.
 * Non-file parts are passed through unchanged.
 *
 * The client MUST upload files first and send the resulting signed URLs in
 * `attachmentUrls`. URLs are consumed in the order they appear.
 */
function buildStorableParts(
  parts: ReadonlyArray<Record<string, unknown>>,
  attachmentUrls?: Array<{ url: string; mediaType: string }>,
): Array<Record<string, unknown>> {
  let attachIdx = 0;
  return parts.map((p) => {
    const t = p.type as string;
    if (t !== "file" && t !== "image") return p;

    const attach = attachmentUrls?.[attachIdx++];
    if (attach) {
      return { type: "file", url: attach.url, mediaType: attach.mediaType };
    }
    console.error(
      "[Chat] Missing attachment URL — client must upload files before sending.",
    );
    return {
      type: "text",
      text: `[Attached: ${(p.mediaType as string) || (p.mimeType as string) || "file"}]`,
    };
  });
}
