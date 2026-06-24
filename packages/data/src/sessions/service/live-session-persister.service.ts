import { liveMessageMapperService } from "./live-message-mapper.service";
import { messageService } from "../index";
import type { AddMessageInput } from "../models/message.model";

/**
 * Handles persistence of live session messages to Firestore.
 * Called when a live session ends or completes.
 */

export interface LiveSessionMessageInput {
  userId: string;
  profileId: string;
  sessionId: string;
  userTranscript?: string;
  aiTranscript?: string;
  audioBase64?: string;
  audioMimeType?: string;
  toolOutputs?: unknown[];
  agentType?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LiveSessionPersisterService {
  /**
   * Persist a user input transcript from live session.
   */
  async persistUserMessage(input: {
    userId: string;
    profileId: string;
    sessionId: string;
    transcript: string;
  }): Promise<void> {
    if (!input.transcript.trim()) return;

    const messageInput: AddMessageInput = {
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId,
      role: "user",
      content: JSON.stringify([
        {
          type: "text",
          text: input.transcript,
          metadata: { source: "live-session" },
        },
      ]),
    };

    await messageService.add(messageInput);
  }

  /**
   * Persist a complete live assistant response.
   * Merges transcript, audio, and tool outputs.
   */
  async persistAssistantMessage(input: LiveSessionMessageInput): Promise<void> {
    const mapper = liveMessageMapperService;
    const createdMessage = mapper.createLiveMessage({
      role: "assistant",
      userTranscript: input.userTranscript,
      aiTranscript: input.aiTranscript,
      audioBase64: input.audioBase64,
      audioMimeType: input.audioMimeType,
      toolOutputs: input.toolOutputs,
      agentType: input.agentType,
    });

    const messageInput: AddMessageInput = {
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId,
      role: "assistant",
      content: createdMessage.content,
      usage: input.usage,
      agentType: createdMessage.agentType,
    };

    await messageService.add(messageInput);
  }

  /**
   * Persist complete live session (both user and assistant turns).
   * Call this when live session ends.
   */
  async persistLiveSession(
    input: LiveSessionMessageInput & {
      userTurns?: string[]; // Multiple user inputs from live session
      isDone?: boolean;
    },
  ): Promise<void> {
    // Persist each user turn first
    if (input.userTurns && input.userTurns.length > 0) {
      for (const transcript of input.userTurns) {
        if (!transcript.trim()) continue;
        await this.persistUserMessage({
          userId: input.userId,
          profileId: input.profileId,
          sessionId: input.sessionId,
          transcript,
        });
      }
    }

    // Persist final assistant message with all outputs
    await this.persistAssistantMessage({
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId,
      userTranscript: input.userTurns?.[0],
      aiTranscript: input.aiTranscript,
      audioBase64: input.audioBase64,
      audioMimeType: input.audioMimeType,
      toolOutputs: input.toolOutputs,
      agentType: input.agentType,
      usage: input.usage,
    });
  }
}

/** Singleton — import throughout the application. */
export const liveSessionPersisterService = new LiveSessionPersisterService();
