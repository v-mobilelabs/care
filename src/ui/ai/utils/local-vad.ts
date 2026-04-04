/**
 * Local Voice Activity Detection (VAD) — Energy-based speech detection
 * Runs in real-time on audio frames for instant barge-in detection
 * without waiting for server-side VAD response.
 *
 * Algorithm:
 * 1. Calculate RMS energy of audio frame
 * 2. Track background noise level (exponential smoothing)
 * 3. Detect speech when energy exceeds noise floor + sensitivity threshold
 * 4. Use hysteresis to reduce false positives
 */

export interface LocalVADConfig {
  /** Sensitivity (0.0-1.0): higher = more aggressive speech detection */
  readonly sensitivity?: number;
  /** Minimum RMS energy to consider for speech (prevents noise detection) */
  readonly minRmsThreshold?: number;
  /** Grace period (ms) to keep speech "active" after silence detected */
  readonly silenceGraceMs?: number;
  /** Noise floor update rate (0.0-1.0): higher = faster adaptation */
  readonly noiseFloorAlpha?: number;
}

export class LocalVAD {
  private isActive = false;
  private noiseFloor = 0;
  private lastActivityTime = 0;
  private lastFrameEnergy = 0;

  private readonly sensitivity: number;
  private readonly minRmsThreshold: number;
  private readonly silenceGraceMs: number;
  private readonly noiseFloorAlpha: number;

  constructor(config: Readonly<LocalVADConfig> = {}) {
    this.sensitivity = Math.max(0, Math.min(1, config.sensitivity ?? 0.5));
    this.minRmsThreshold = config.minRmsThreshold ?? 0.001;
    this.silenceGraceMs = config.silenceGraceMs ?? 300;
    this.noiseFloorAlpha = Math.max(
      0,
      Math.min(1, config.noiseFloorAlpha ?? 0.1),
    );
  }

  /**
   * Process a PCM audio frame and detect speech activity.
   * Returns true if speech is detected in this frame or recent frames.
   */
  process(pcmFrame: Float32Array | Int16Array): boolean {
    const energy = this.calculateRmsEnergy(pcmFrame);
    this.lastFrameEnergy = energy;

    // Initialize noise floor on first frame
    if (this.noiseFloor === 0) {
      this.noiseFloor = energy;
    }

    // Update noise floor with exponential smoothing (adapt to background)
    // Only update when energy is low (likely silence)
    if (energy < this.noiseFloor * 1.5) {
      this.noiseFloor =
        this.noiseFloor * (1 - this.noiseFloorAlpha) +
        energy * this.noiseFloorAlpha;
    }

    // Speech detection threshold: noise floor + sensitivity-based margin
    // Sensitivity maps 0.5→2x, 0.1→1.3x, 0.9→3x multiplier
    const sensitivityMultiplier = 1 + this.sensitivity * 2;
    const threshold = this.noiseFloor * sensitivityMultiplier;

    // Detect speech onset
    const isSpeechNow = energy > Math.max(this.minRmsThreshold, threshold);

    if (isSpeechNow) {
      this.isActive = true;
      this.lastActivityTime = Date.now();
    } else {
      // Check if we're still in the grace period
      const timeSinceSpeech = Date.now() - this.lastActivityTime;
      this.isActive = timeSinceSpeech < this.silenceGraceMs;
    }

    return this.isActive;
  }

  /**
   * Get current detected speech state.
   */
  isVoiceActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current frame energy (for UI visualization).
   */
  getFrameEnergy(): number {
    return this.lastFrameEnergy;
  }

  /**
   * Get current noise floor estimate.
   */
  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  /**
   * Reset VAD state (call on disconnect or session change).
   */
  reset(): void {
    this.isActive = false;
    this.noiseFloor = 0;
    this.lastActivityTime = 0;
    this.lastFrameEnergy = 0;
  }

  /**
   * Calculate RMS (Root Mean Square) energy of an audio frame.
   * Works with both Float32 (-1.0 to 1.0) and Int16 (-32768 to 32767) PCM.
   */
  private calculateRmsEnergy(pcmFrame: Float32Array | Int16Array): number {
    if (pcmFrame.length === 0) return 0;

    let sumSquares = 0;

    if (pcmFrame instanceof Float32Array) {
      // Float32 PCM: values in range [-1.0, 1.0]
      for (let i = 0; i < pcmFrame.length; i += 1) {
        const sample = pcmFrame[i] ?? 0;
        sumSquares += sample * sample;
      }
    } else {
      // Int16 PCM: values in range [-32768, 32767]
      // Normalize to [-1.0, 1.0] range before squaring
      for (let i = 0; i < pcmFrame.length; i += 1) {
        const sample = ((pcmFrame[i] ?? 0) as number) / 32768;
        sumSquares += sample * sample;
      }
    }

    const meanSquare = sumSquares / pcmFrame.length;
    return Math.sqrt(meanSquare);
  }
}
