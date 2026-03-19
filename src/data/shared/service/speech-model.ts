import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type SpeechModel } from "ai";

const MODEL_ID = "gemini-2.5-flash-preview-tts";

export const TTS_INSTRUCTION =
  "Speak in a warm, calm, and reassuring tone at a moderate pace. " +
  "Pronounce medical terms clearly and pause briefly before important " +
  "information. Sound empathetic and supportive, like a caring nurse " +
  "explaining things to a patient.";

/**
 * Custom fetch that injects TTS audio config into the Gemini request.
 *
 * The `@ai-sdk/google` Zod schema only allows `responseModalities: ["TEXT","IMAGE"]`,
 * so we intercept the serialised JSON after validation and patch in `["AUDIO"]` + `speechConfig`.
 */
function createTtsFetch(voice: string): typeof globalThis.fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.body && typeof init.body === "string") {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      const gen = (body.generationConfig ?? {}) as Record<string, unknown>;
      gen.responseModalities = ["AUDIO"];
      gen.speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      };
      body.generationConfig = gen;
      return fetch(input, { ...init, body: JSON.stringify(body) });
    }
    return fetch(input, init);
  };
}

/** Write the 44-byte WAV header for mono 16-bit PCM. */
function writeWavHeader(header: Buffer, pcmLen: number, rate: number) {
  const byteRate = rate * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLen, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmLen, 40);
}

function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const header = Buffer.alloc(44);
  writeWavHeader(header, pcm.length, sampleRate);
  return new Uint8Array(Buffer.concat([header, pcm]));
}

function toWav(file: Readonly<{ uint8Array: Uint8Array; mediaType: string }>) {
  if (!file.mediaType.startsWith("audio/L16")) return file.uint8Array;
  const rateMatch = file.mediaType.match(/rate=(\d+)/);
  return pcmToWav(file.uint8Array, Number(rateMatch?.[1] ?? 24000));
}

async function callTts(
  options: Readonly<{ text: string; voice?: string; instructions?: string }>,
) {
  const provider = createGoogleGenerativeAI({
    fetch: createTtsFetch(options.voice ?? "Kore"),
  });
  const { files } = await generateText({
    model: provider(MODEL_ID),
    prompt: options.text,
    system: options.instructions,
    maxRetries: 0, // outer generateSpeech handles retries
  });
  if (!files.length) throw new Error("No audio generated");
  return toWav(files[0]);
}

/**
 * Gemini TTS speech model adapter (SpeechModelV3).
 *
 * Uses `@ai-sdk/google` language model with a custom fetch interceptor that
 * injects `responseModalities: ["AUDIO"]` + `speechConfig`. Audio is converted
 * from PCM L16 to WAV before returning.
 *
 * Usage: `generateSpeech({ model: geminiSpeechModel, text, voice, instructions })`
 */
export const geminiSpeechModel: Extract<
  SpeechModel,
  { specificationVersion: "v3" }
> = {
  specificationVersion: "v3",
  provider: "google-generative-ai",
  modelId: MODEL_ID,

  async doGenerate(options) {
    const wav = await callTts(options);
    return {
      audio: wav,
      warnings: [],
      response: { timestamp: new Date(), modelId: MODEL_ID },
    };
  },
};
