"use client";
/**
 * _use-voice-focus-transformer.ts
 *
 * Encapsulates Amazon Voice Focus noise-cancellation state and logic:
 *  - Refs for the VF transformer, active transform device, and raw device ID
 *  - `startAudioInput` — called once during Chime session initialisation
 *  - `toggle`          — called from the mic noise-cancel button
 */
import {
  ConsoleLogger,
  LogLevel,
  VoiceFocusDeviceTransformer,
  type DefaultMeetingSession,
} from "amazon-chime-sdk-js";
import { notifications } from "@mantine/notifications";
import { useRef, useState } from "react";

type VfDevice = Awaited<
  ReturnType<VoiceFocusDeviceTransformer["createTransformDevice"]>
>;

/** 8-second outer timeout for the full VF init, 5-second inner for startAudioInput. */
const VF_INIT_TIMEOUT_MS = 8_000;
const VF_START_AUDIO_TIMEOUT_MS = 5_000;

/** Race a promise against a deadline — returns `null` on timeout. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((res) => setTimeout(() => res(null), ms)),
  ]);
}

export interface UseVoiceFocusTransformerReturn {
  noiseCancellationOn: boolean;
  setNoiseCancellationOn: (on: boolean) => void;
  /** Ref to the raw audio device ID selected during init (survives toggle cycles). */
  rawAudioDeviceIdRef: React.MutableRefObject<string | null>;
  /** Ref to the VF transformer (reused across toggle cycles). */
  vfTransformerRef: React.MutableRefObject<VoiceFocusDeviceTransformer | null>;
  /** Ref to the active VF transform device (reused when toggling back on). */
  vfDeviceRef: React.MutableRefObject<VfDevice>;
  /**
   * Attempt to start the Chime audio input with Voice Focus.
   * Falls back to the raw device on any failure or timeout.
   * Returns `true` if VF is active, `false` if plain mic was used.
   *
   * @param sess            Active Chime session
   * @param preferredAudioId  The preferred/fallback device ID list
   * @param audioDevices    Enumerated device list (for fallback)
   * @param cancelled       Closure variable set by the init effect cleanup
   * @param initCountRef    Ref holding the latest init ID
   * @param myInitId        ID of the current init to guard against races
   */
  startAudioInput: (params: {
    sess: DefaultMeetingSession;
    preferredAudioId: string;
    audioDevices: MediaDeviceInfo[];
    cancelled: () => boolean;
    initCountRef: React.MutableRefObject<number>;
    myInitId: number;
  }) => Promise<boolean>;
  /**
   * Toggle noise cancellation on/off.
   * Reuses the existing transformer/device when available.
   */
  toggle: (
    sess: DefaultMeetingSession | null,
    selectedAudioInput: string | null,
  ) => Promise<void>;
}

export function useVoiceFocusTransformer(): UseVoiceFocusTransformerReturn {
  const [noiseCancellationOn, setNoiseCancellationOn] = useState(false);
  const vfTransformerRef = useRef<VoiceFocusDeviceTransformer | null>(null);
  const vfDeviceRef = useRef<VfDevice>(
    undefined,
  ) as React.MutableRefObject<VfDevice>;
  const rawAudioDeviceIdRef = useRef<string | null>(null);

  // ── Session init ───────────────────────────────────────────────────────

  const startAudioInput: UseVoiceFocusTransformerReturn["startAudioInput"] =
    async ({
      sess,
      preferredAudioId,
      audioDevices,
      cancelled,
      initCountRef,
      myInitId,
    }) => {
      rawAudioDeviceIdRef.current = preferredAudioId;

      const logger = new ConsoleLogger("VF", LogLevel.WARN);
      let vfActive = false;

      try {
        const vfResult = await withTimeout(
          (async () => {
            console.log("[VoiceFocus] Checking support...");
            const isSupported = await VoiceFocusDeviceTransformer.isSupported(
              undefined,
              { logger },
            );
            console.log("[VoiceFocus] Supported:", isSupported);
            if (!isSupported) return false;

            console.log("[VoiceFocus] Creating transformer...");
            const transformer = await VoiceFocusDeviceTransformer.create(
              { variant: "auto" },
              { logger },
            );
            console.log("[VoiceFocus] Transformer created");
            vfTransformerRef.current = transformer;

            console.log("[VoiceFocus] Creating transform device...");
            const device =
              await transformer.createTransformDevice(preferredAudioId);
            if (!device) return false;

            vfDeviceRef.current = device;

            // Guard: check init hasn't been superseded
            if (initCountRef.current !== myInitId) {
              console.log(
                "[VoiceFocus] Init",
                myInitId,
                "superseded, aborting",
              );
              return false;
            }

            console.log("[VoiceFocus] Starting audio input...");
            await Promise.race([
              sess.audioVideo.startAudioInput(device),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error("startAudioInput timeout")),
                  VF_START_AUDIO_TIMEOUT_MS,
                ),
              ),
            ]);
            console.log(
              "[VoiceFocus] Audio input started with noise cancellation",
            );
            return true;
          })(),
          VF_INIT_TIMEOUT_MS,
        );

        if (vfResult === true) {
          vfActive = true;
        } else {
          if (vfResult === null)
            console.warn("[VoiceFocus] Timed out, falling back to raw mic");
          await startPlainAudio(
            sess,
            preferredAudioId,
            audioDevices,
            cancelled,
            initCountRef,
            myInitId,
          );
        }
      } catch (err) {
        console.warn("[VoiceFocus] Init failed, falling back to raw mic:", err);
        await startPlainAudio(
          sess,
          preferredAudioId,
          audioDevices,
          cancelled,
          initCountRef,
          myInitId,
        );
      }

      return vfActive;
    };

  // ── Toggle (button press) ──────────────────────────────────────────────

  const toggle: UseVoiceFocusTransformerReturn["toggle"] = async (
    sess,
    selectedAudioInput,
  ) => {
    if (!sess) return;
    const rawId = rawAudioDeviceIdRef.current ?? selectedAudioInput;

    if (noiseCancellationOn) {
      setNoiseCancellationOn(false);
      if (!rawId) return;
      try {
        await sess.audioVideo.startAudioInput(rawId);
      } catch (audioErr) {
        console.warn("[Audio] Failed to switch to raw mic:", audioErr);
        const devices = await sess.audioVideo.listAudioInputDevices();
        const fallback = devices[0]?.deviceId;
        if (fallback) {
          try {
            await sess.audioVideo.startAudioInput(fallback);
            rawAudioDeviceIdRef.current = fallback;
          } catch {
            notifications.show({
              title: "Microphone error",
              message: "Unable to access microphone. Please check your device.",
              color: "red",
            });
          }
        }
      }
    } else {
      if (!rawId) {
        notifications.show({
          title: "Not available",
          message: "No microphone detected",
          color: "yellow",
        });
        return;
      }
      setNoiseCancellationOn(true);
      try {
        // Reuse existing device when possible
        const existingDevice = vfDeviceRef.current;
        if (existingDevice) {
          await sess.audioVideo.startAudioInput(existingDevice);
          return;
        }

        // Create transformer if not yet available
        let transformer = vfTransformerRef.current;
        if (!transformer) {
          const silentLogger = new ConsoleLogger("VF", LogLevel.OFF);
          const supported = await VoiceFocusDeviceTransformer.isSupported(
            undefined,
            { logger: silentLogger },
          );
          if (!supported) {
            setNoiseCancellationOn(false);
            notifications.show({
              title: "Not available",
              message: "Noise cancellation is not supported on this browser",
              color: "yellow",
            });
            return;
          }
          transformer = await VoiceFocusDeviceTransformer.create(
            { variant: "auto" },
            { logger: silentLogger },
          );
          vfTransformerRef.current = transformer;
        }

        const device = await transformer.createTransformDevice(rawId);
        if (device) {
          vfDeviceRef.current = device;
          await sess.audioVideo.startAudioInput(device);
        } else {
          setNoiseCancellationOn(false);
          notifications.show({
            title: "Not available",
            message: "Failed to enable noise cancellation",
            color: "yellow",
          });
        }
      } catch (err) {
        setNoiseCancellationOn(false);
        console.error("[VoiceFocus] Toggle error:", err);
        notifications.show({
          title: "Error",
          message: "Failed to toggle noise cancellation",
          color: "red",
        });
      }
    }
  };

  return {
    noiseCancellationOn,
    setNoiseCancellationOn,
    rawAudioDeviceIdRef,
    vfTransformerRef,
    vfDeviceRef,
    startAudioInput,
    toggle,
  };
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Start plain audio, falling back to the first available device on error. */
async function startPlainAudio(
  sess: DefaultMeetingSession,
  preferredId: string,
  audioDevices: MediaDeviceInfo[],
  cancelled: () => boolean,
  initCountRef: React.MutableRefObject<number>,
  myInitId: number,
) {
  if (cancelled() || initCountRef.current !== myInitId) return;
  try {
    await sess.audioVideo.startAudioInput(preferredId);
    console.log("[Chime] Plain audio input started");
  } catch {
    if (cancelled() || initCountRef.current !== myInitId) return;
    const fallback = audioDevices[0]?.deviceId;
    if (fallback) {
      await sess.audioVideo.startAudioInput(fallback);
      console.log("[Chime] Fallback audio input started");
    }
  }
}
