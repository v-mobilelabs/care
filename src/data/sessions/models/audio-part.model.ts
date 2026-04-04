import { z } from "zod";

// ── Audio Part for message content ────────────────────────────────────────────

/**
 * Represents an audio part in a message (e.g., Gemini Live response audio).
 * Stored in message.parts as a discriminated union with text and tool parts.
 * Does NOT store the signed URL directly — signed URLs are generated on-demand via API.
 */
export interface AudioPart {
  readonly type: "audio";
  readonly mimeType: string; // e.g., "audio/wav", "audio/webm"
  readonly duration: number; // Duration in seconds
  readonly sampleRate: number; // e.g., 24000
  /** GCS object path (e.g. "sessions/{sid}/audio/{mid}.wav"). Used to generate signed URLs on demand. */
  readonly storagePath?: string;
}

// ── Zod Schema for validation ──────────────────────────────────────────────────

export const AudioPartSchema = z.object({
  type: z.literal("audio"),
  mimeType: z.string().min(1, "MIME type required"),
  duration: z.number().finite().min(0, "Duration must be >= 0"),
  sampleRate: z.number().int().positive("Sample rate must be > 0"),
  storagePath: z.string().optional(),
});

export type AudioPartDto = z.infer<typeof AudioPartSchema>;

// ── Creator helper ────────────────────────────────────────────────────────────

export function createAudioPart(
  mimeType: string,
  duration: number,
  sampleRate: number,
  storagePath?: string,
): AudioPart {
  return {
    type: "audio",
    mimeType,
    duration,
    sampleRate,
    ...(storagePath ? { storagePath } : {}),
  };
}
