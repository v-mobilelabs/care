import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { bucket } from "@/lib/firebase/admin";
import { createAudioPart } from "../models/audio-part.model";
import type { AudioPart } from "../models/audio-part.model";

const SaveSessionAudioSchema = z.object({
  userId: z.string().min(1, "userId required"),
  sessionId: z.string().min(1, "sessionId required"),
  messageId: z.string().min(1, "messageId required"),
  audioChunks: z
    .array(z.string().min(1))
    .min(1, "At least one audio chunk required"),
});

export type SaveSessionAudioInput = z.infer<typeof SaveSessionAudioSchema>;

/**
 * Use case: Save Gemini Live session audio to Cloud Storage.
 * Called after a message generation completes to persist the audio output.
 */
export class SaveSessionAudioUseCase extends UseCase<
  SaveSessionAudioInput,
  {
    audioParts: AudioPart[];
    totalDuration: number;
  }
> {
  static validate(input: unknown): SaveSessionAudioInput {
    return SaveSessionAudioSchema.parse(input);
  }

  protected async run(input: SaveSessionAudioInput): Promise<{
    audioParts: AudioPart[];
    totalDuration: number;
  }> {
    const { userId: _userId, sessionId, messageId, audioChunks } = input;

    // Decode and merge all audio chunks into a single WAV file
    const pcmBuffers: Uint8Array[] = [];
    let totalDuration = 0;

    for (let i = 0; i < audioChunks.length; i++) {
      try {
        // Decode base64 PCM chunk
        const binaryStr = atob(audioChunks[i]);
        const pcmBytes = new Uint8Array(binaryStr.length);
        for (let j = 0; j < binaryStr.length; j++) {
          const codePoint = binaryStr.codePointAt(j);
          if (codePoint !== undefined) {
            pcmBytes[j] = codePoint;
          }
        }
        pcmBuffers.push(pcmBytes);

        // Calculate duration (16-bit PCM at 24kHz = 2 bytes per sample)
        const numSamples = pcmBytes.length / 2;
        totalDuration += numSamples / 24000;
      } catch (err) {
        console.error(
          `[SaveSessionAudioUseCase] Failed to decode chunk ${i}:`,
          err,
        );
      }
    }

    if (!pcmBuffers.length) {
      throw new Error(
        "[SaveSessionAudioUseCase] Failed to decode any audio chunks",
      );
    }

    // Merge PCM buffers into a single buffer
    const totalPCMSize = pcmBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const mergedPCM = new Uint8Array(totalPCMSize);
    let offset = 0;
    for (const buf of pcmBuffers) {
      mergedPCM.set(buf, offset);
      offset += buf.length;
    }

    // Convert PCM to WAV format
    const wavBytes = pcmToWav(mergedPCM, 24000, 1);

    // Upload merged WAV to Cloud Storage using Admin SDK
    // Path includes messageId so each message has its own audio file
    const destinationPath = `sessions/${sessionId}/audio/${messageId}.wav`;
    try {
      await bucket.file(destinationPath).save(wavBytes, {
        metadata: {
          contentType: "audio/wav",
        },
      });
    } catch (err) {
      console.error(
        "[SaveSessionAudioUseCase] Failed to upload merged audio:",
        err,
      );
      throw new Error(
        `Failed to upload audio: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }

    // Return audio part with storagePath so the UI can generate signed URLs on demand
    const audioPart = createAudioPart(
      "audio/wav",
      totalDuration,
      24_000,
      destinationPath,
    );

    return {
      audioParts: [audioPart],
      totalDuration,
    };
  }
}

// ── PCM to WAV Converter ───────────────────────────────────────────────────

function pcmToWav(
  pcmData: Uint8Array,
  sampleRate: number,
  channels: number = 1,
): Uint8Array {
  const bytesPerSample = 2;

  // WAV header (44 bytes)
  const headerSize = 44;
  const fileSize = headerSize + pcmData.length - 8;
  const subchunk2Size = pcmData.length;

  const wav = new Uint8Array(headerSize + pcmData.length);
  const view = new DataView(wav.buffer);

  // "RIFF" chunk
  wav.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, fileSize, true); // File size - 8

  // "WAVE" format
  wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // "fmt " subchunk
  wav.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, channels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // ByteRate
  view.setUint16(32, channels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // "data" subchunk
  wav.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, subchunk2Size, true); // Subchunk2Size

  // Copy PCM data
  wav.set(pcmData, headerSize);

  return wav;
}
