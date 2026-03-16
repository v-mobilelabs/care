"use client";
import { useEffect, useRef } from "react";
import { useInbox } from "./use-inbox";
import { showBrowserNotification } from "@/lib/notifications/browser-notifications";

/**
 * Play a short synthetic notification blip using the Web Audio API.
 * Falls back to /sounds/message.mp3 if it exists.
 */
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);

    // Clean up context after sound finishes
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // Web Audio API unavailable — silently ignore.
  }
}

/**
 * Plays a short notification sound when the total unread message count
 * increases (i.e. a new DM arrived). Skipped on the initial load.
 * Muted when `muted` is true (e.g. the messaging drawer is open).
 *
 * Also shows a browser notification when the tab is backgrounded so the
 * user sees a system-level alert even if they've switched tabs.
 */
export function useMessageSound(uid: string | null, muted: boolean) {
  const { entries } = useInbox(uid);
  const totalUnread = entries.reduce((sum, e) => sum + e.unread, 0);
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    if (muted || !uid) return;

    if (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current) {
      playNotificationSound();

      // Find the conversation with the newest unread message for the notification body
      const newest = entries
        .filter((e) => e.unread > 0)
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0];

      if (newest) {
        showBrowserNotification(`New message from ${newest.otherName}`, {
          body: newest.lastMessage,
          tag: "dm-" + newest.conversationId,
        });
      }
    }

    prevUnreadRef.current = totalUnread;
  }, [totalUnread, muted, uid, entries]);
}
