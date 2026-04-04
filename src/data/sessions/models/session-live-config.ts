import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

/**
 * Live session configuration tracking.
 * Stored in session document under optional `liveConfig` field.
 */

export interface SessionLiveConfigDocument {
  /** Whether live mode is currently enabled for this session */
  isLiveMode: boolean;
  /** Latest resumption handle for session recovery */
  lastSessionHandle?: string;
  /** Last known VAD sensitivity setting (0-1) */
  lastVadSensitivity?: number;
  /** Timestamp when live mode was last enabled */
  liveEnabledAt?: Timestamp;
  /** Timestamp of last resumption/reconnection attempt */
  lastResumeRetry?: Timestamp;
  /** Live session duration in milliseconds (if completed) */
  totalLiveDurationMs?: number;
  /** Model used for this live session */
  model?: string;
  /** Response modalities enabled (AUDIO, TEXT) */
  responseModalities?: readonly ("AUDIO" | "TEXT")[];
}

export const SessionLiveConfigSchema = z.object({
  isLiveMode: z.boolean().default(false),
  lastSessionHandle: z.string().optional(),
  lastVadSensitivity: z.number().min(0).max(1).optional(),
  liveEnabledAt: z.date().optional(),
  lastResumeRetry: z.date().optional(),
  totalLiveDurationMs: z.number().nonnegative().optional(),
  model: z.string().optional(),
  responseModalities: z.array(z.enum(["AUDIO", "TEXT"])).optional(),
});

export type SessionLiveConfig = z.infer<typeof SessionLiveConfigSchema>;

/**
 * Helpers for managing live config
 */

export function createEmptyLiveConfig(): SessionLiveConfig {
  return {
    isLiveMode: false,
  };
}

export function updateLiveConfigAfterConnect(
  config: SessionLiveConfig,
  options?: {
    model?: string;
    responseModalities?: ("AUDIO" | "TEXT")[];
    vadSensitivity?: number;
  },
): SessionLiveConfig {
  return {
    ...config,
    isLiveMode: true,
    liveEnabledAt: new Date(),
    model: options?.model ?? config.model,
    responseModalities: options?.responseModalities ?? config.responseModalities,
    lastVadSensitivity: options?.vadSensitivity ?? config.lastVadSensitivity,
  };
}

export function updateLiveConfigAfterDisconnect(
  config: SessionLiveConfig,
  durationMs?: number,
): SessionLiveConfig {
  return {
    ...config,
    isLiveMode: false,
    totalLiveDurationMs: durationMs ?? config.totalLiveDurationMs,
  };
}

export function updateLiveConfigWithSessionHandle(
  config: SessionLiveConfig,
  handle: string,
): SessionLiveConfig {
  return {
    ...config,
    lastSessionHandle: handle,
    lastResumeRetry: new Date(),
  };
}
