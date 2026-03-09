"use client";
import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";
import { useEffect, useRef, useState } from "react";

// ── Minimal browser SpeechRecognition interface ───────────────────────────────

interface SpeechRec extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: { isFinal: boolean; [n: number]: { transcript: string } }[];
}

type SpeechRecCtor = new () => SpeechRec;

function getSR(): SpeechRecCtor | undefined {
  const win = window as typeof window & {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LivePhase = "idle" | "listening" | "thinking" | "speaking";

// Errors that mean we should just restart recognition rather than giving up.
const RECOVERABLE_ERRORS = new Set(["network", "aborted", "no-speech"]);

// ── TTS helpers ───────────────────────────────────────────────────────────────

/** Pick the best available TTS voice (prefer enhanced/neural English voices). */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer local (non-network) English voices that contain "enhanced" or "premium"
  const enhanced = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      !v.localService === false &&
      /enhanced|premium|neural/i.test(v.name),
  );
  if (enhanced) return enhanced;
  // Fall back to any local English voice
  return (
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

/**
 * Speak `text` via TTS, chunked by sentence boundaries to avoid the Chrome
 * ~200-word SpeechSynthesisUtterance truncation bug. Calls `onDone` when all
 * chunks have finished (or synthesis is cancelled).
 */
function speakChunked(text: string, onDone: () => void): void {
  window.speechSynthesis.cancel();

  // Split on sentence-ending punctuation, keeping the delimiter.
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const voice = pickVoice();
  let idx = 0;

  function speakNext() {
    if (idx >= sentences.length) {
      onDone();
      return;
    }
    const chunk = sentences[idx++].trim();
    if (!chunk) {
      speakNext();
      return;
    }

    const utt = new SpeechSynthesisUtterance(chunk);
    utt.rate = 1.05;
    if (voice) utt.voice = voice;
    utt.onend = () => speakNext();
    utt.onerror = (e) => {
      // "interrupted" fires when we cancel mid-speech (e.g. closeLive) — ignore.
      if ((e as SpeechSynthesisErrorEvent).error !== "interrupted") speakNext();
    };
    window.speechSynthesis.speak(utt);
  }

  speakNext();
}

// ── Hook options / return ─────────────────────────────────────────────────────

interface UseLiveSpeechOptions {
  /** Called when the user finishes speaking — send the transcript as a message. */
  onSendMessage: (text: string) => void;
  /** Messages array from `useChat` — needed to detect new AI responses for TTS. */
  messages: UIMessage[];
  /** Status from `useChat` — TTS waits until streaming is finished. */
  status: string;
}

export interface UseLiveSpeechReturn {
  liveMode: boolean;
  livePhase: LivePhase;
  liveTranscript: string;
  liveAIText: string;
  openLive: () => void;
  closeLive: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveSpeech({
  onSendMessage,
  messages,
  status,
}: Readonly<UseLiveSpeechOptions>): UseLiveSpeechReturn {
  const [liveMode, setLiveMode] = useState(false);
  const [livePhase, setLivePhase] = useState<LivePhase>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveAIText, setLiveAIText] = useState("");

  const liveRecRef = useRef<SpeechRec | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveModeRef = useRef(false);
  const livePhaseRef = useRef<LivePhase>("idle");
  const lastSpokenRef = useRef("");

  function syncLiveMode(v: boolean) {
    liveModeRef.current = v;
    setLiveMode(v);
  }

  function syncLivePhase(v: LivePhase) {
    livePhaseRef.current = v;
    setLivePhase(v);
  }

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function startLiveListening() {
    syncLivePhase("listening");
    setLiveTranscript("");

    const SR = getSR();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let committed = "";

    rec.onerror = (e) => {
      if (
        RECOVERABLE_ERRORS.has(e.error) &&
        liveModeRef.current &&
        livePhaseRef.current === "listening"
      ) {
        // Brief pause then restart so the session stays alive.
        setTimeout(() => {
          if (liveModeRef.current && livePhaseRef.current === "listening") {
            startLiveListening();
          }
        }, 300);
      } else if (!RECOVERABLE_ERRORS.has(e.error)) {
        // Non-recoverable (e.g. "not-allowed") — exit live mode gracefully.
        syncLivePhase("idle");
        syncLiveMode(false);
      }
    };

    rec.onend = () => {
      // `continuous` recognition can still end unexpectedly on some browsers.
      // Restart automatically if we're still supposed to be listening.
      if (liveModeRef.current && livePhaseRef.current === "listening") {
        setTimeout(() => {
          if (liveModeRef.current && livePhaseRef.current === "listening") {
            startLiveListening();
          }
        }, 150);
      }
    };

    rec.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) committed += (committed ? " " : "") + final.trim();
      setLiveTranscript(
        committed + (interim ? (committed ? " " : "") + interim : ""),
      );

      clearSilenceTimer();
      if (committed.trim()) {
        // 2 200 ms gives a more natural pause before submitting.
        silenceTimerRef.current = setTimeout(() => {
          liveRecRef.current?.abort();
          syncLivePhase("thinking");
          onSendMessage(committed.trim());
          committed = "";
        }, 2200);
      }
    };

    liveRecRef.current = rec;
    rec.start();
  }

  function openLive() {
    syncLiveMode(true);
    lastSpokenRef.current = "";
    setLiveAIText("");
    startLiveListening();
  }

  function closeLive() {
    syncLiveMode(false);
    syncLivePhase("idle");
    clearSilenceTimer();
    liveRecRef.current?.abort();
    liveRecRef.current = null;
    window.speechSynthesis.cancel();
    setLiveTranscript("");
    setLiveAIText("");
  }

  // ── TTS: speak AI responses during the live session ───────────────────────
  useEffect(() => {
    if (!liveMode) return;
    if (livePhaseRef.current !== "thinking") return;
    if (status === "streaming" || status === "submitted") return;

    const lastAsst = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAsst) return;

    const text = lastAsst.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join("")
      // Strip markdown so the spoken text sounds natural.
      .replace(/[*_`#>~]+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!text || text === lastSpokenRef.current) return;

    lastSpokenRef.current = text;
    setLiveAIText(text);
    syncLivePhase("speaking");

    speakChunked(text, () => {
      if (liveModeRef.current) startLiveListening();
    });

    // Refs and inner functions are stable — intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status, liveMode]);

  return {
    liveMode,
    livePhase,
    liveTranscript,
    liveAIText,
    openLive,
    closeLive,
  };
}
