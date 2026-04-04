"use client";

import { useCallback } from "react";
import { liveMessageMapperService } from "@/data/sessions/service/live-message-mapper.service";

/**
 * Hook for handling completion of Gemini Live sessions.
 * Converts accumulated live data into persistable UIMessage format.
 */

export interface AudioPart {
  readonly type: "audio";
  readonly url: string;
  readonly mimeType: string;
  readonly duration: number;
  readonly sampleRate: number;
}

export interface LiveSessionData {
  messages?: Array<{
    role: "user" | "assistant";
    text: string;
    timestamp?: number;
    parts?: readonly (AudioPart | { type: "text"; text: string })[];
  }>;
  userTranscript?: string;
  aiTranscript?: string;
  audioChunks?: Blob[] | AudioPart[];
  toolOutputs?: unknown[];
  durationMs?: number;
  agentType?: string;
}

export interface UseLiveSessionCompletionOptions {
  /** Called when live session completes and message is ready to send */
  onSessionComplete?: (
    mergedMessage: Readonly<{
      content: string;
      kind: "text" | "audio" | "mixed";
      agentType?: string;
    }>,
  ) => void | Promise<void>;
  /** Called before completion to allow veto */
  onBeforeComplete?: (data: LiveSessionData) => boolean | Promise<boolean>;
  /** Called on completion errors */
  onError?: (error: Error) => void;
}

export function useLiveSessionCompletion(
  options: Readonly<UseLiveSessionCompletionOptions> = {},
) {
  const completeSession = useCallback(
    async (data: LiveSessionData): Promise<void> => {
      try {
        // Check if caller wants to veto
        if (options.onBeforeComplete) {
          const shouldProceed = await options.onBeforeComplete(data);
          if (!shouldProceed) return;
        }

        // Extract audio parts from messages or audioChunks
        let audioParts: AudioPart[] = [];

        // Check if audioChunks contains AudioPart objects (with type: "audio" and url)
        if (data.audioChunks && data.audioChunks.length > 0) {
          const firstChunk = data.audioChunks[0];
          if (
            typeof firstChunk === "object" &&
            firstChunk !== null &&
            "type" in firstChunk &&
            (firstChunk as unknown as Record<string, unknown>).type === "audio"
          ) {
            // audioChunks contains AudioPart objects
            audioParts = data.audioChunks as unknown as AudioPart[];
          }
        }

        // Also check messages for audio parts
        if (!audioParts.length && data.messages) {
          for (const msg of data.messages) {
            if (msg.parts) {
              for (const part of msg.parts) {
                if (typeof part === "object" && part !== null) {
                  const asRecord = part as Record<string, unknown>;
                  if (asRecord.type === "audio") {
                    audioParts.push(part as AudioPart);
                  }
                }
              }
            }
          }
        }

        // Convert audio blobs to base64 if present (legacy support)
        let audioBase64: string | undefined;
        let audioMimeType: string | undefined;

        if (data.audioChunks && data.audioChunks.length > 0) {
          const firstChunk = data.audioChunks[0];
          // Only process as Blob if it's not an AudioPart
          if (!(typeof firstChunk === "object" && "type" in firstChunk)) {
            try {
              const blob = new Blob(data.audioChunks as unknown as Blob[], {
                type: "audio/wav",
              });
              audioBase64 = await blobToBase64(blob);
              audioMimeType = "audio/wav";
            } catch (error) {
              console.error(
                "[LiveSessionCompletion] Failed to encode audio:",
                error,
              );
              // Continue without audio
            }
          }
        }

        // Create merged message using mapper service
        const mergedMessage = liveMessageMapperService.createLiveMessage({
          role: "assistant",
          userTranscript: data.userTranscript,
          aiTranscript: data.aiTranscript,
          audioBase64,
          audioMimeType,
          toolOutputs: data.toolOutputs,
          agentType: data.agentType,
          audioParts: audioParts.length > 0 ? audioParts : undefined,
        });

        // Notify completion
        if (options.onSessionComplete) {
          await options.onSessionComplete(mergedMessage);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (options.onError) {
          options.onError(err);
        } else {
          console.error("[LiveSessionCompletion]", err);
        }
        throw err;
      }
    },
    [options],
  );

  return { completeSession };
}

/**
 * Utility: Convert blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader result is not a string"));
        return;
      }
      // Extract base64 part after "data:...;base64,"
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64 from blob"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error("FileReader error"));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility: Extract text summary from live session for preview
 */
export function getLiveSessionSummary(
  data: LiveSessionData,
  maxLength = 100,
): string {
  const texts = [
    data.userTranscript,
    data.aiTranscript,
    data.messages?.[0]?.text,
  ];

  const combined = texts
    .filter((t) => Boolean(t))
    .join(" ")
    .trim();

  if (combined.length <= maxLength) return combined;
  return `${combined.slice(0, maxLength - 1)}…`;
}
