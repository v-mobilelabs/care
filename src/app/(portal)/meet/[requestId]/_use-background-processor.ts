"use client";
/**
 * _use-background-processor.ts
 *
 * Encapsulates Chime background-blur state and logic:
 *  - Refs for the blur processor and active transform device
 *  - `startVideoInput` — called once during Chime session initialisation
 *  - `toggle`          — called from the blur toggle button
 *  - `applyToDevice`   — called by camera toggle to re-apply blur on camera-on
 */
import {
  BackgroundBlurVideoFrameProcessor,
  ConsoleLogger,
  DefaultVideoTransformDevice,
  LogLevel,
  type DefaultMeetingSession,
} from "amazon-chime-sdk-js";
import { notifications } from "@mantine/notifications";
import { useRef, useState } from "react";

type BlurProcessor = NonNullable<
  Awaited<ReturnType<typeof BackgroundBlurVideoFrameProcessor.create>>
>;

const BLUR_STRENGTH = 15;

export interface UseBackgroundProcessorReturn {
  backgroundBlurOn: boolean;
  setBackgroundBlurOn: (on: boolean) => void;
  /** Ref to the active blur processor (reused across toggle cycles). */
  blurProcessorRef: React.MutableRefObject<BlurProcessor | null>;
  /** Ref to the active video transform device. */
  blurTransformDeviceRef: React.MutableRefObject<DefaultVideoTransformDevice | null>;
  /**
   * Start video input during Chime session init.
   * Tries background blur first, falls back to raw camera.
   * Returns `true` if blur is active.
   *
   * @param sess            Active Chime session
   * @param preferredVideoId  Preferred camera device ID
   * @param videoDevices    Enumerated devices (for fallback)
   * @param logger          Chime logger from the session init
   * @param cancelled       Closure variable set by the init effect cleanup
   */
  startVideoInput: (params: {
    sess: DefaultMeetingSession;
    preferredVideoId: string;
    videoDevices: MediaDeviceInfo[];
    logger: ConsoleLogger;
    cancelled: () => boolean;
  }) => Promise<boolean>;
  /**
   * Toggle background blur on/off.
   * Creates a fresh processor when needed (processor is destroyed on off).
   *
   * @param sess             Active Chime session
   * @param cameraOn         Current camera state
   * @param selectedVideoId  Currently selected video device ID
   * @param localTileIdRef   Ref to the local tile ID (for rebinding the video element)
   * @param localVideoRef    Ref to the local <video> element
   */
  toggle: (params: {
    sess: DefaultMeetingSession | null;
    cameraOn: boolean;
    selectedVideoId: string | null;
    localTileIdRef: React.MutableRefObject<number | null>;
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  }) => Promise<void>;
  /**
   * Apply blur to a video device — used by camera toggle when turning
   * the camera back on while blur is enabled.
   * Returns `true` if blur was applied, `false` on failure.
   */
  applyToDevice: (
    sess: DefaultMeetingSession,
    deviceId: string,
  ) => Promise<DefaultVideoTransformDevice | null>;
}

export function useBackgroundProcessor(): UseBackgroundProcessorReturn {
  const [backgroundBlurOn, setBackgroundBlurOn] = useState(true); // on by default
  const blurProcessorRef = useRef<BlurProcessor | null>(null);
  const blurTransformDeviceRef = useRef<DefaultVideoTransformDevice | null>(
    null,
  );

  // ── Session init ───────────────────────────────────────────────────────

  const startVideoInput: UseBackgroundProcessorReturn["startVideoInput"] =
    async ({ sess, preferredVideoId, videoDevices, logger, cancelled }) => {
      sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);

      try {
        console.log("[BackgroundBlur] Checking support...");
        const isSupported =
          await BackgroundBlurVideoFrameProcessor.isSupported();
        console.log("[BackgroundBlur] Supported:", isSupported);

        if (!isSupported) {
          return await startPlainVideo(
            sess,
            preferredVideoId,
            videoDevices,
            cancelled,
          );
        }

        console.log("[BackgroundBlur] Creating processor...");
        const processor = await BackgroundBlurVideoFrameProcessor.create(
          undefined,
          { blurStrength: BLUR_STRENGTH, logger },
        );
        console.log("[BackgroundBlur] Processor created:", !!processor);

        if (!processor) {
          return await startPlainVideo(
            sess,
            preferredVideoId,
            videoDevices,
            cancelled,
          );
        }

        blurProcessorRef.current = processor as BlurProcessor;
        const transformDevice = new DefaultVideoTransformDevice(
          logger,
          preferredVideoId,
          [processor],
        );
        blurTransformDeviceRef.current = transformDevice;

        try {
          console.log("[BackgroundBlur] Starting video input with blur...");
          await sess.audioVideo.startVideoInput(transformDevice);
          console.log("[BackgroundBlur] Video input started with blur");
          return true;
        } catch (videoErr) {
          console.warn(
            "[Video] Blur device failed, falling back to raw:",
            videoErr,
          );
          if (cancelled()) return false;
          return await startPlainVideo(
            sess,
            preferredVideoId,
            videoDevices,
            cancelled,
          );
        }
      } catch (blurErr) {
        console.warn(
          "[BackgroundBlur] Init failed, falling back to raw camera:",
          blurErr,
        );
        if (cancelled()) return false;
        return await startPlainVideo(
          sess,
          preferredVideoId,
          videoDevices,
          cancelled,
        );
      }
    };

  // ── Toggle (button press) ──────────────────────────────────────────────

  const toggle: UseBackgroundProcessorReturn["toggle"] = async ({
    sess,
    cameraOn,
    selectedVideoId,
    localTileIdRef,
    localVideoRef,
  }) => {
    if (!sess || !cameraOn || !selectedVideoId) return;

    if (backgroundBlurOn) {
      // Turn OFF → swap to raw camera first (avoids visible freeze),
      // then tear down WASM/WebGL pipeline in background.
      setBackgroundBlurOn(false);
      try {
        const oldTransform = blurTransformDeviceRef.current;
        blurTransformDeviceRef.current = null;
        // Destroy processor — the underlying resources can't be reused.
        blurProcessorRef.current = null;
        sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
        await sess.audioVideo.startVideoInput(selectedVideoId);
        rebindLocalVideo(sess, localTileIdRef, localVideoRef);
        oldTransform?.stop().catch(() => undefined);
      } catch (err) {
        console.error("[BackgroundBlur] Failed to disable:", err);
      }
    } else {
      // Turn ON → create a fresh processor
      setBackgroundBlurOn(true);
      try {
        let processor = blurProcessorRef.current;
        if (!processor) {
          const isSupported =
            await BackgroundBlurVideoFrameProcessor.isSupported();
          if (!isSupported) {
            setBackgroundBlurOn(false);
            notifications.show({
              title: "Not available",
              message: "Background blur is not supported on this browser",
              color: "yellow",
            });
            return;
          }
          const created = await BackgroundBlurVideoFrameProcessor.create(
            undefined,
            {
              blurStrength: BLUR_STRENGTH,
              logger: new ConsoleLogger("Blur", LogLevel.OFF),
            },
          );
          if (!created) {
            setBackgroundBlurOn(false);
            notifications.show({
              title: "Not available",
              message: "Failed to initialise background blur",
              color: "yellow",
            });
            return;
          }
          processor = created as BlurProcessor;
          blurProcessorRef.current = processor;
        }

        sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
        const transformDevice = new DefaultVideoTransformDevice(
          new ConsoleLogger("Blur", LogLevel.OFF),
          selectedVideoId,
          [processor],
        );
        blurTransformDeviceRef.current = transformDevice;
        await sess.audioVideo.startVideoInput(transformDevice);
        rebindLocalVideo(sess, localTileIdRef, localVideoRef);
      } catch (err) {
        setBackgroundBlurOn(false);
        console.error("[BackgroundBlur] Toggle error:", err);
        notifications.show({
          title: "Error",
          message: "Failed to enable background blur",
          color: "red",
        });
      }
    }
  };

  // ── Apply to device (used by camera toggle when turning camera on) ─────

  const applyToDevice: UseBackgroundProcessorReturn["applyToDevice"] = async (
    sess,
    deviceId,
  ) => {
    const processor = blurProcessorRef.current;
    if (!processor) return null;
    try {
      const transformDevice = new DefaultVideoTransformDevice(
        new ConsoleLogger("Blur", LogLevel.OFF),
        deviceId,
        [processor],
      );
      blurTransformDeviceRef.current = transformDevice;
      await sess.audioVideo.startVideoInput(transformDevice);
      return transformDevice;
    } catch {
      await sess.audioVideo.startVideoInput(deviceId).catch(() => undefined);
      return null;
    }
  };

  return {
    backgroundBlurOn,
    setBackgroundBlurOn,
    blurProcessorRef,
    blurTransformDeviceRef,
    startVideoInput,
    toggle,
    applyToDevice,
  };
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Start plain video, falling back to first enumerated device on error. */
async function startPlainVideo(
  sess: DefaultMeetingSession,
  preferredId: string,
  videoDevices: MediaDeviceInfo[],
  cancelled: () => boolean,
): Promise<false> {
  if (cancelled()) return false;
  try {
    await sess.audioVideo.startVideoInput(preferredId);
    console.log("[Chime] Plain video input started");
  } catch {
    if (cancelled()) return false;
    const fallback = videoDevices[0]?.deviceId;
    if (fallback) {
      await sess.audioVideo.startVideoInput(fallback);
      console.log("[Chime] Fallback video input started");
    }
  }
  return false;
}

/** Re-bind and kick the local <video> element after a video input swap. */
function rebindLocalVideo(
  sess: DefaultMeetingSession,
  localTileIdRef: React.MutableRefObject<number | null>,
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>,
) {
  if (localTileIdRef.current !== null && localVideoRef.current) {
    sess.audioVideo.bindVideoElement(
      localTileIdRef.current,
      localVideoRef.current,
    );
    localVideoRef.current.play().catch(() => undefined);
  }
}
