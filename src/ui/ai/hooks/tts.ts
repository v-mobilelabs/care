/**
 * Shared TTS (Text-to-Speech) helpers using the Web Speech Synthesis API.
 * Used by the per-message play button via useTTS.
 */

/** Pick the best available TTS voice (prefer enhanced/neural English voices). */
export function pickVoice(): SpeechSynthesisVoice | null {
  const voices = globalThis.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const enhanced = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      v.localService &&
      /enhanced|premium|neural/i.test(v.name),
  );
  if (enhanced) return enhanced;
  return (
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

function speakSentence(
  chunk: string,
  voice: SpeechSynthesisVoice | null,
  next: () => void,
) {
  const utt = new SpeechSynthesisUtterance(chunk);
  utt.rate = 1.05;
  if (voice) utt.voice = voice;
  utt.onend = () => next();
  utt.onerror = (e) => {
    if (e.error !== "interrupted") next();
  };
  globalThis.speechSynthesis.speak(utt);
}

/**
 * Speak `text` via browser TTS, chunked by sentence boundaries to avoid the
 * Chrome ~200-word SpeechSynthesisUtterance truncation bug.
 */
export function speakChunked(text: string, onDone: () => void): void {
  globalThis.speechSynthesis.cancel();
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const voice = pickVoice();
  let idx = 0;

  function next() {
    const chunk = sentences[idx++]?.trim();
    if (!chunk) {
      if (idx >= sentences.length) onDone();
      else next();
      return;
    }
    speakSentence(chunk, voice, next);
  }
  next();
}

/** Stop any currently playing TTS. */
export function stopSpeaking(): void {
  globalThis.speechSynthesis.cancel();
}

/** Strip markdown formatting so spoken text sounds natural. */
export function stripMarkdown(text: string): string {
  return text
    .replaceAll(/[*_`#>~]+/g, "")
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replaceAll(/\n{2,}/g, ". ")
    .replaceAll("\n", " ")
    .trim();
}
