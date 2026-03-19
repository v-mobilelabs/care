"use client";
/**
 * useTTS — per-message text-to-speech playback using browser Speech Synthesis.
 *
 * Only one message can be spoken at a time (global singleton).
 * Components call `toggle(messageId, text)` to start/stop.
 * `speakingId` tells every instance which message is currently playing
 * so only that one renders the "stop" state.
 */
import { useSyncExternalStore } from "react";
import { speakChunked, stopSpeaking, stripMarkdown } from "@/ui/ai/hooks/tts";

// ── Global singleton state ────────────────────────────────────────────────────

let currentId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function getSnapshot(): string | null {
  return currentId;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function play(id: string, rawText: string) {
  stopSpeaking();
  currentId = id;
  notify();

  const text = stripMarkdown(rawText);
  if (!text) {
    currentId = null;
    notify();
    return;
  }

  speakChunked(text, () => {
    if (currentId === id) {
      currentId = null;
      notify();
    }
  });
}

function stop() {
  stopSpeaking();
  currentId = null;
  notify();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTTS() {
  const speakingId = useSyncExternalStore(subscribe, getSnapshot, () => null);

  function toggle(messageId: string, text: string) {
    if (speakingId === messageId) {
      stop();
    } else {
      play(messageId, text);
    }
  }

  return { speakingId, toggle };
}
