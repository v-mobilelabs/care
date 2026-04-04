import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";

/**
 * Maps Gemini Live API message events to persistent UIMessage parts.
 * Handles audio, transcriptions, and tool responses.
 */

export interface LiveServerContent {
  modelTurn?: {
    parts?: Array<{
      text?: string;
      inlineData?: {
        mimeType?: string;
        data?: string; // base64-encoded audio
      };
    }>;
  };
  outputTranscription?: {
    transcript?: string;
  };
  inputTranscription?: {
    transcript?: string;
  };
  interrupted?: boolean;
}

export class LiveMessageMapperService {
  /**
   * Convert Live API serverContent to UIMessage parts.
   * Processes text, audio data, and transcriptions.
   */
  mapServerContentToParts(content: LiveServerContent): UIMessage["parts"] {
    const parts: UIMessage["parts"] = [];

    // Add output transcription first (user-readable text)
    if (content.outputTranscription?.transcript) {
      parts.push({
        type: "text",
        text: content.outputTranscription.transcript,
      });
    }

    // Add model turn parts (text + audio)
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          parts.push({
            type: "text",
            text: part.text,
          });
        }

        if (part.inlineData?.data && part.inlineData?.mimeType) {
          // Store audio data as a text part with base64 indicator
          // Later: implement custom part rendering or use attachments
          parts.push({
            type: "text",
            text: `[Audio: ${part.inlineData.mimeType}]`,
          });
        }
      }
    }

    // Flag if interrupted
    if (content.interrupted) {
      parts.push({
        type: "text",
        text: "[Interrupted by user]",
      });
    }

    return parts;
  }

  /**
   * Merge user input transcript + AI response + tool outputs into single message content.
   * Returns JSON-stringified parts ready for Firestore persistence.
   */
  mergeTranscriptions(
    userInputTranscript: string,
    aiOutputTranscript: string,
    toolOutputs: unknown[] = [],
  ): string {
    const parts: UIMessage["parts"] = [];

    // User input context
    if (userInputTranscript.trim()) {
      parts.push({
        type: "text",
        text: `[User: ${userInputTranscript}]`,
      });
    }

    // AI response (main content)
    if (aiOutputTranscript.trim()) {
      parts.push({
        type: "text",
        text: aiOutputTranscript,
      });
    }

    // Tool results
    for (const toolOutput of toolOutputs) {
      if (
        toolOutput &&
        typeof toolOutput === "object" &&
        "type" in toolOutput &&
        typeof toolOutput.type === "string" &&
        toolOutput.type.startsWith("tool-")
      ) {
        parts.push(toolOutput as UIMessage["parts"][0]);
      }
    }

    return JSON.stringify(parts);
  }

  /**
   * Create a persistent message combining live session data.
   * This is the final message format stored in Firestore.
   */
  createLiveMessage(input: {
    role: "user" | "assistant";
    userTranscript?: string;
    aiTranscript?: string;
    audioBase64?: string;
    audioMimeType?: string;
    toolOutputs?: unknown[];
    agentType?: string;
    audioParts?: ReadonlyArray<{
      readonly type: "audio";
      readonly url: string;
      readonly mimeType: string;
      readonly duration: number;
      readonly sampleRate: number;
    }>;
  }): {
    content: string;
    kind: "text" | "audio" | "mixed";
    agentType?: string;
  } {
    const parts: UIMessage["parts"] = [];
    let hasAudio = false;

    // Add user transcript if available
    if (input.userTranscript?.trim()) {
      parts.push({
        type: "text",
        text: input.userTranscript,
      });
    }

    // Add AI response transcript
    if (input.aiTranscript?.trim()) {
      parts.push({
        type: "text",
        text: input.aiTranscript,
      });
    }

    // Add audio parts if available (Cloud Storage URLs) — include as full AudioPart objects
    if (input.audioParts && input.audioParts.length > 0) {
      for (const audioPart of input.audioParts) {
        parts.push(audioPart as unknown as UIMessage["parts"][0]);
        hasAudio = true;
      }
    }

    // Add audio reference if available (legacy base64)
    if (input.audioBase64 && input.audioMimeType) {
      parts.push({
        type: "text",
        text: `[Audio: ${input.audioMimeType}]`,
      });
      hasAudio = true;
    }

    // Add tool outputs
    if (input.toolOutputs && Array.isArray(input.toolOutputs)) {
      for (const toolOutput of input.toolOutputs) {
        if (
          toolOutput &&
          typeof toolOutput === "object" &&
          "type" in toolOutput &&
          typeof toolOutput.type === "string" &&
          toolOutput.type.startsWith("tool-")
        ) {
          parts.push(toolOutput as UIMessage["parts"][0]);
        }
      }
    }

    // Determine kind based on parts
    const kind: "text" | "audio" | "mixed" =
      hasAudio && parts.length > 1 ? "mixed" : hasAudio ? "audio" : "text";

    return {
      content: JSON.stringify(parts),
      kind,
      ...(input.agentType && { agentType: input.agentType }),
    };
  }

  /**
   * Extract text summary from live message parts for preview.
   */
  getTextSummary(parts: UIMessage["parts"], maxLength = 140): string {
    const textParts = parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ");

    if (textParts.length <= maxLength) return textParts;
    return `${textParts.slice(0, maxLength - 1)}…`;
  }
}

/** Singleton — import throughout the application. */
export const liveMessageMapperService = new LiveMessageMapperService();
