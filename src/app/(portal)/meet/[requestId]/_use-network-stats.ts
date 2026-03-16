/**
 * _use-network-stats.ts — Hook for polling network statistics during active calls.
 */
import { type DefaultMeetingSession } from "amazon-chime-sdk-js";
import { useEffect, useState } from "react";
import type { NetworkStats } from "./_room-types";

interface UseNetworkStatsParams {
  sessionRef: React.RefObject<DefaultMeetingSession | null>;
  status: "initialising" | "ready" | "error";
  callDuration: number;
}

/**
 * Polls RTCPeerConnection stats every 5 seconds while the call is active.
 * Returns network quality metrics: RTT, bandwidth, packet loss, and overall quality rating.
 */
export function useNetworkStats({
  sessionRef,
  status,
  callDuration,
}: UseNetworkStatsParams) {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    if (status !== "ready") return;
    let stopped = false;

    const pollStats = async () => {
      const sess = sessionRef.current;
      if (!sess || stopped) return;
      try {
        const stats = await sess.audioVideo.getRTCPeerConnectionStats();
        if (!stats) return;
        let rtt = 0;
        let bytesSentNow = 0;
        let bytesRecvNow = 0;
        let packetsLost = 0;
        let packetsTotal = 0;

        stats.forEach((report) => {
          if (
            report.type === "candidate-pair" &&
            report.state === "succeeded"
          ) {
            rtt = report.currentRoundTripTime
              ? report.currentRoundTripTime * 1000
              : 0;
          }
          if (report.type === "inbound-rtp" && report.kind === "video") {
            bytesRecvNow += report.bytesReceived || 0;
            packetsLost += report.packetsLost || 0;
            packetsTotal +=
              (report.packetsReceived || 0) + (report.packetsLost || 0);
          }
          if (report.type === "outbound-rtp" && report.kind === "video") {
            bytesSentNow += report.bytesSent || 0;
          }
        });

        const loss = packetsTotal > 0 ? (packetsLost / packetsTotal) * 100 : 0;
        const quality: NetworkStats["quality"] = (() => {
          if (rtt > 300 || loss > 5) return "poor";
          if (rtt > 150 || loss > 2) return "fair";
          return "good";
        })();

        setNetworkStats({
          rtt: Math.round(rtt),
          uplinkKbps: Math.round(
            (bytesSentNow * 8) / 1024 / Math.max(1, callDuration),
          ),
          downlinkKbps: Math.round(
            (bytesRecvNow * 8) / 1024 / Math.max(1, callDuration),
          ),
          packetLoss: Math.round(loss * 10) / 10,
          quality,
        });
      } catch {
        /* ignore stats errors */
      }
    };

    void pollStats();
    const interval = setInterval(() => void pollStats(), 5000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [sessionRef, status, callDuration]);

  return networkStats;
}
