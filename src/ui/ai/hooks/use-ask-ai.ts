"use client";

import { useRouter } from "next/navigation";
import { usePendingAskAI } from "@/ui/ai/context/chat-context";

// ── Input types (discriminated union for type-safe file vs text) ──────────────

interface AskAITextInput {
  type: "text";
  text: string;
  sessionId?: string;
}

interface AskAIFileInput {
  type: "file";
  text: string;
  /** File ID — the hook resolves the signed GCS URL via /api/files/{fileId}. */
  fileId: string;
  /** MIME type of the file — if provided, skips extension inference. */
  mimeType?: string;
  sessionId?: string;
}

export type AskAIInput = AskAITextInput | AskAIFileInput;

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferMediaType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "doc" || ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/pdf";
}

async function resolveFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`/api/files/${fileId}`, { method: "POST" });
  if (res.ok) {
    const data = (await res.json()) as { url: string };
    if (data.url) return data.url;
  }
  return `${window.location.origin}/api/files/${fileId}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns `askAI` — resolves file URLs, sets a pending message in the provider,
 * then navigates to the assistant page where the provider auto-sends it.
 */
export function useAskAI() {
  const router = useRouter();
  const { setPendingAskAI } = usePendingAskAI();

  async function askAI(input: AskAIInput): Promise<string> {
    const sessionId = input.sessionId ?? crypto.randomUUID();

    // Resolve the signed GCS URL before building the pending payload.
    const resolvedUrl =
      input.type === "file" ? await resolveFileUrl(input.fileId) : undefined;

    // Build file attachments for the pending payload.
    const files =
      input.type === "file" && resolvedUrl
        ? [{ url: resolvedUrl, mediaType: input.mimeType ?? inferMediaType(resolvedUrl) }]
        : undefined;

    // Set the pending message — the provider will auto-send once hydrated.
    setPendingAskAI({ text: input.text, sessionId, files });

    // Navigate to the assistant page with the target session ID.
    router.push(`/patient/assistant?id=${sessionId}`);
    return sessionId;
  }

  return { askAI };
}
