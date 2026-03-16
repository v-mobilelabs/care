/**
 * _room-helpers.ts — Standalone helper utilities for the Chime meeting room.
 */
import {
  ConsoleLogger,
  DefaultMeetingSession,
  LogLevel,
} from "amazon-chime-sdk-js";

/**
 * ConsoleLogger subclass that suppresses the "session will not be reconnected"
 * message. Chime emits this at ERROR level when we intentionally call stop()
 * (e.g. user hangs up, component unmounts). It is not an actionable error —
 * we already handle cleanup in stopSession() — so we drop it to keep the
 * console clean.
 */
export class ChimeLogger extends ConsoleLogger {
  override error(msg: string): void {
    if (msg.includes("session will not be reconnected")) return;
    // Chime event-reporting pipeline throws this when it encounters a
    // non-primitive attribute value during metrics serialisation. It is
    // internal telemetry noise and has no effect on the call itself.
    if (msg.includes("Unhandled type received while flattening attributes"))
      return;
    // Chime signaling WebSocket closes normally when a meeting ends or the
    // user navigates away. This is expected teardown, not an actionable error.
    if (msg.includes("SignalingChannelClosedUnexpectedly")) return;
    // Chime logs this as an error when the host ends the meeting. It is
    // expected — audioVideoDidStop handles the disconnect/navigation.
    if (msg.includes("MeetingEnded")) return;
    // Chime fires this when the same user joins from a second device —
    // we handle it in audioVideoDidStop with a user-facing modal.
    if (msg.includes("AudioJoinedFromAnotherDevice")) return;
    // OverconstrainedError occurs when a previously-selected device becomes
    // unavailable (unplugged, changed ID). We handle this with fallback logic.
    if (msg.includes("OverconstrainedError")) return;
    super.error(msg);
  }
}

/**
 * Properly tear down a Chime session:
 * 1. Stop video input  → releases camera hardware (fixes "camera light stays on")
 * 2. Stop audio input  → releases microphone hardware
 * 3. Stop session      → closes WebRTC connection
 */
export async function stopSession(sess: DefaultMeetingSession): Promise<void> {
  try {
    await sess.audioVideo.stopVideoInput();
  } catch {
    /* ignore */
  }
  try {
    await sess.audioVideo.stopAudioInput();
  } catch {
    /* ignore */
  }
  try {
    sess.audioVideo.stop();
  } catch {
    /* ignore */
  }
}

/**
 * Race a promise against a timeout — returns `null` when the deadline expires.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Logger instance configured to WARN level for Chime SDK.
 */
export function createChimeLogger(): ConsoleLogger {
  return new ChimeLogger("Chime", LogLevel.WARN);
}

/**
 * Logger instance for background blur (OFF level to reduce noise).
 */
export function createBlurLogger(): ConsoleLogger {
  return new ConsoleLogger("Blur", LogLevel.OFF);
}
