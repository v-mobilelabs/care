import { getStorage, ref, uploadBytes, getBytes } from "firebase/storage";
import type { FirebaseApp } from "firebase/app";

/**
 * PCM to WAV converter.
 * Converts raw PCM audio (16-bit signed little-endian) to WAV format.
 */
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

  // PCM data
  wav.set(pcmData, headerSize);

  return wav;
}

/**
 * Calculate duration of PCM audio in seconds.
 */
function calculateDuration(pcmDataLength: number, sampleRate: number): number {
  const bytesPerSample = 2;
  const numSamples = pcmDataLength / bytesPerSample;
  return numSamples / sampleRate;
}

/**
 * Service for uploading and managing audio files from Gemini Live streams.
 */
export class AudioStorageService {
  constructor(private readonly firebaseApp: FirebaseApp) {}

  /**
   * Upload a base64-encoded PCM audio chunk to Cloud Storage.
   * Returns the file path and metadata.
   */
  async uploadAudioChunk(
    sessionId: string,
    chunkIndex: number,
    base64Pcm: string,
  ): Promise<{ path: string; duration: number }> {
    // Decode base64 to Uint8Array
    const binaryStr = atob(base64Pcm);
    const pcmBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      const charCode = binaryStr.codePointAt(i);
      if (charCode !== undefined) {
        pcmBytes[i] = charCode;
      }
    }

    // Convert PCM to WAV (24kHz, mono)
    const sampleRate = 24_000;
    const wavData = pcmToWav(pcmBytes, sampleRate, 1);
    const duration = calculateDuration(pcmBytes.length, sampleRate);

    // Upload to Cloud Storage
    const storage = getStorage(this.firebaseApp);
    const filePath = `sessions/${sessionId}/audio/chunk-${chunkIndex}.wav`;
    const storageRef = ref(storage, filePath);

    const blob = new Blob([wavData as BlobPart], { type: "audio/wav" });
    await uploadBytes(storageRef, blob, {
      contentType: "audio/wav",
      customMetadata: {
        sessionId,
        chunkIndex: String(chunkIndex),
        sampleRate: String(sampleRate),
      },
    });

    return { path: filePath, duration };
  }

  /**
   * Merge multiple audio chunks into a single WAV file.
   * Returns the merged file path.
   */
  async mergeAudioChunks(
    sessionId: string,
    chunkIndices: number[],
    destinationPath: string,
  ): Promise<{ path: string; duration: number }> {
    const storage = getStorage(this.firebaseApp);

    // Fetch all chunks
    const chunks: { data: Uint8Array; duration: number }[] = [];
    let totalDuration = 0;
    const sampleRate = 24_000;

    for (const index of chunkIndices) {
      const chunkPath = `sessions/${sessionId}/audio/chunk-${index}.wav`;
      const chunkRef = ref(storage, chunkPath);

      try {
        const chunkArrayBuffer = await getBytes(chunkRef);
        const chunkBytes = new Uint8Array(chunkArrayBuffer);
        // Extract PCM data from WAV (skip 44-byte header)
        const pcmData = chunkBytes.slice(44);
        const duration = calculateDuration(pcmData.length, sampleRate);

        chunks.push({ data: pcmData, duration });
        totalDuration += duration;
      } catch (err) {
        console.warn(
          `[AudioStorageService] Failed to fetch chunk ${index}:`,
          err,
        );
      }
    }

    // Concatenate all PCM data
    const totalPcmLength = chunks.reduce((sum, c) => sum + c.data.length, 0);
    const mergedPcm = new Uint8Array(totalPcmLength);
    let offset = 0;

    for (const chunk of chunks) {
      mergedPcm.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    // Convert to WAV
    const wavData = pcmToWav(mergedPcm, sampleRate, 1);

    // Upload merged file
    const destRef = ref(storage, destinationPath);
    const blob = new Blob([wavData as BlobPart], { type: "audio/wav" });

    await uploadBytes(destRef, blob, {
      contentType: "audio/wav",
      customMetadata: {
        sessionId,
        mergedChunks: String(chunkIndices.length),
        totalDuration: String(totalDuration),
      },
    });

    return { path: destinationPath, duration: totalDuration };
  }
}
