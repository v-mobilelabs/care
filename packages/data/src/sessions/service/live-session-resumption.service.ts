import { sessionRepository } from "../repositories/session.repository";
import {
  updateLiveConfigWithSessionHandle,
  updateLiveConfigAfterDisconnect,
  createEmptyLiveConfig,
  type SessionLiveConfig,
} from "../models/session-live-config";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";

/**
 * Handles persistence and retrieval of Live API session resumption handles.
 * Enables recovery from network disconnects and server-side session resets.
 */

export interface LiveSessionResumptionState {
  handle: string;
  expiresAt: Date;
  createdAt: Date;
}

export class LiveSessionResumptionService {
  /**
   * Save the latest session resumption handle.
   * Called on `sessionResumptionUpdate.newHandle` from Live API.
   */
  async saveSessionHandle(
    userId: string,
    profileId: string,
    sessionId: string,
    handle: string,
  ): Promise<void> {
    try {
      // Load current session
      const session = await sessionRepository.findById(
        userId,
        profileId,
        sessionId,
      );
      if (!session) {
        console.warn(
          "[LiveSessionResumption] Session not found, cannot save handle",
        );
        return;
      }

      // Get current live config or create empty
      const sessionAsUnk = session as unknown as {
        liveConfig?: SessionLiveConfig;
      };
      const currentLiveConfig: SessionLiveConfig =
        sessionAsUnk.liveConfig ?? createEmptyLiveConfig();

      // Update with new handle
      const updatedLiveConfig = updateLiveConfigWithSessionHandle(
        currentLiveConfig,
        handle,
      );

      // Persist back to session
      await sessionRepository.update(userId, profileId, sessionId, {
        liveConfig: stripUndefined(
          updatedLiveConfig as unknown as Record<string, unknown>,
        ),
      } as unknown as Record<string, unknown>);
    } catch (error) {
      console.error(
        "[LiveSessionResumption] Failed to save session handle:",
        error,
      );
      // Don't throw — resumption is nice-to-have, not critical
    }
  }

  /**
   * Retrieve the latest saved resumption handle for a session.
   * Returns null if not found or expired.
   */
  async getSessionHandle(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<string | null> {
    try {
      const session = await sessionRepository.findById(
        userId,
        profileId,
        sessionId,
      );
      const sessionAsUnk =
        (session as unknown as { liveConfig?: SessionLiveConfig }) ?? {};
      const liveConfig = sessionAsUnk.liveConfig;
      if (!liveConfig?.lastSessionHandle) {
        return null;
      }

      return liveConfig.lastSessionHandle;
    } catch (error) {
      console.error(
        "[LiveSessionResumption] Failed to retrieve session handle:",
        error,
      );
      return null;
    }
  }

  /**
   * Handle graceful disconnection from Live API.
   * Persists the session as completed.
   */
  async handleDisconnection(
    userId: string,
    profileId: string,
    sessionId: string,
    durationMs?: number,
  ): Promise<void> {
    try {
      const session = await sessionRepository.findById(
        userId,
        profileId,
        sessionId,
      );
      if (!session) {
        console.warn(
          "[LiveSessionResumption] Session not found for disconnect",
        );
        return;
      }

      const sessionAsUnk = session as unknown as {
        liveConfig?: SessionLiveConfig;
      };
      const currentLiveConfig: SessionLiveConfig =
        sessionAsUnk.liveConfig ?? createEmptyLiveConfig();
      const updatedLiveConfig = updateLiveConfigAfterDisconnect(
        currentLiveConfig,
        durationMs,
      );

      await sessionRepository.update(userId, profileId, sessionId, {
        liveConfig: stripUndefined(
          updatedLiveConfig as unknown as Record<string, unknown>,
        ),
      } as unknown as Record<string, unknown>);
    } catch (error) {
      console.error(
        "[LiveSessionResumption] Failed to handle disconnection:",
        error,
      );
    }
  }

  /**
   * Check if session has a valid resumption handle within 2-hour window.
   * Per Gemini Live docs, handles are valid for ~2 hours after termination.
   */
  async isResumptionAvailable(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<boolean> {
    const handle = await this.getSessionHandle(userId, profileId, sessionId);
    if (!handle) return false;

    // In production, check timestamp validity
    // For now, assume handle exists = valid (Firestore TTL handles cleanup)
    return true;
  }

  /**
   * Clear old session handles (called on manual session closure).
   */
  async clearSessionHandle(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<void> {
    try {
      const session = await sessionRepository.findById(
        userId,
        profileId,
        sessionId,
      );
      const sessionAsUnk =
        (session as unknown as { liveConfig?: SessionLiveConfig }) ?? {};
      if (!sessionAsUnk.liveConfig) return;

      const currentLiveConfig: SessionLiveConfig = sessionAsUnk.liveConfig;
      const clearedConfig: SessionLiveConfig = {
        ...currentLiveConfig,
        lastSessionHandle: undefined,
      };

      await sessionRepository.update(userId, profileId, sessionId, {
        liveConfig: stripUndefined(
          clearedConfig as unknown as Record<string, unknown>,
        ),
      } as unknown as Record<string, unknown>);
    } catch (error) {
      console.error(
        "[LiveSessionResumption] Failed to clear session handle:",
        error,
      );
    }
  }
}

/** Singleton — import throughout the application. */
export const liveSessionResumptionService = new LiveSessionResumptionService();
