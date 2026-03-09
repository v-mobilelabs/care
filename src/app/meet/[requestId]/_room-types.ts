/**
 * Shared types for the meeting room sub-components.
 */

export interface Participant {
  name: string;
  photoUrl?: string | null;
}

export type ConnectionHealth = "good" | "poor" | "reconnecting";

export interface NetworkStats {
  rtt: number;
  uplinkKbps: number;
  downlinkKbps: number;
  packetLoss: number;
  quality: "excellent" | "good" | "fair" | "poor";
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
