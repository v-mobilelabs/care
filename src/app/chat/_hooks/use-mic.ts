"use client";
import { useRef, useState } from "react";

// ── Minimal browser SpeechRecognition interface ───────────────────────────────

interface SpeechRec extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseMicOptions {
  /** Current textarea value — interim results are appended to it. */
  input: string;
  setInput: (value: string) => void;
}

export function useMic({ input, setInput }: UseMicOptions) {
  const recognitionRef = useRef<SpeechRec | null>(null);
  const [isListening, setIsListening] = useState(false);

  function toggleMic() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = getSR();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    let committed = input;

    rec.onstart = () => setIsListening(true);
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    rec.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) committed = committed + (committed ? " " : "") + final.trim();
      setInput(committed + (interim ? (committed ? " " : "") + interim : ""));
    };

    recognitionRef.current = rec;
    rec.start();
  }

  return { isListening, toggleMic };
}
