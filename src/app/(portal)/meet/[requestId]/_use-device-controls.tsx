"use client";
/**
 * _use-device-controls.ts — Hook for managing audio/video devices and features.
 */
import {
    BackgroundBlurVideoFrameProcessor,
    ConsoleLogger,
    DefaultVideoTransformDevice,
    LogLevel,
    VoiceFocusDeviceTransformer,
    type BackgroundBlurProcessor,
    type BackgroundFilterSpec,
    type DefaultMeetingSession,
    type VoiceFocusTransformDevice,
} from "amazon-chime-sdk-js";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconScreenShare, IconX } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import { createBlurLogger } from "./_room-helpers";

interface UseDeviceControlsParams {
    requestId: string;
    sessionRef: React.RefObject<DefaultMeetingSession | null>;
    localTileIdRef: React.RefObject<number | null>;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    screenShareOnRef: React.RefObject<boolean>;
    initialMicOn?: boolean;
    initialCameraOn?: boolean;
}

interface DeviceControlsState {
    // State
    micOn: boolean;
    cameraOn: boolean;
    noiseCancellationOn: boolean;
    backgroundBlurOn: boolean;
    screenShareOn: boolean;
    selectedAudioInput: string | null;
    selectedVideoInput: string | null;
    // Setters (for external state management)
    setMicOn: React.Dispatch<React.SetStateAction<boolean>>;
    setCameraOn: React.Dispatch<React.SetStateAction<boolean>>;
    setNoiseCancellationOn: React.Dispatch<React.SetStateAction<boolean>>;
    setBackgroundBlurOn: React.Dispatch<React.SetStateAction<boolean>>;
    setScreenShareOn: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedAudioInput: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedVideoInput: React.Dispatch<React.SetStateAction<string | null>>;
    // Refs (for internal device management)
    vfTransformerRef: React.RefObject<VoiceFocusDeviceTransformer | null>;
    vfDeviceRef: React.RefObject<VoiceFocusTransformDevice | null>;
    rawAudioDeviceIdRef: React.RefObject<string | null>;
    blurProcessorRef: React.RefObject<BackgroundBlurProcessor | null>;
    blurTransformDeviceRef: React.RefObject<DefaultVideoTransformDevice | null>;
    // Actions
    toggleMic: () => Promise<void>;
    toggleCamera: () => Promise<void>;
    toggleNoiseCancellation: () => Promise<void>;
    toggleBackgroundBlur: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    switchAudioInput: (deviceId: string) => Promise<void>;
    switchVideoInput: (deviceId: string) => Promise<void>;
}

/**
 * Manages all device controls: mic, camera, noise cancellation, background blur,
 * screen share, and device switching.
 */
export function useDeviceControls({
    requestId,
    sessionRef,
    localTileIdRef,
    localVideoRef,
    screenShareOnRef,
    initialMicOn = true,
    initialCameraOn = true,
}: UseDeviceControlsParams): DeviceControlsState {
    const [micOn, setMicOn] = useState(initialMicOn);
    const [cameraOn, setCameraOn] = useState(initialCameraOn);
    const [noiseCancellationOn, setNoiseCancellationOn] = useState(false);
    const [backgroundBlurOn, setBackgroundBlurOn] = useState(true);
    const [screenShareOn, setScreenShareOn] = useState(false);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
    const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null);

    const vfTransformerRef = useRef<VoiceFocusDeviceTransformer | null>(null);
    const vfDeviceRef = useRef<VoiceFocusTransformDevice | null>(null);
    const rawAudioDeviceIdRef = useRef<string | null>(null);
    const blurProcessorRef = useRef<BackgroundBlurProcessor | null>(null);
    const blurTransformDeviceRef = useRef<DefaultVideoTransformDevice | null>(null);

    // ── Mic toggle ──────────────────────────────────────────────────────────
    const toggleMic = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        if (micOn) {
            await sess.audioVideo.realtimeMuteLocalAudio();
        } else {
            await sess.audioVideo.realtimeUnmuteLocalAudio();
        }
        setMicOn((v) => {
            const next = !v;
            try { sessionStorage.setItem(`callMicOn_${requestId}`, String(next)); } catch { /* quota */ }
            return next;
        });
    }, [micOn, requestId, sessionRef]);

    // ── Camera toggle ───────────────────────────────────────────────────────
    const toggleCamera = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        if (cameraOn) {
            sess.audioVideo.stopLocalVideoTile();
            // Release camera hardware so the camera indicator light turns off
            await sess.audioVideo.stopVideoInput();
        } else {
            const videoDevices = await sess.audioVideo.listVideoInputDevices();
            if (videoDevices[0]?.deviceId) {
                sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                // Re-apply background blur if it was on
                if (backgroundBlurOn && blurProcessorRef.current) {
                    const transformDevice = new DefaultVideoTransformDevice(
                        createBlurLogger(),
                        videoDevices[0].deviceId,
                        [blurProcessorRef.current],
                    );
                    blurTransformDeviceRef.current = transformDevice;
                    await sess.audioVideo.startVideoInput(transformDevice);
                } else {
                    try {
                        await sess.audioVideo.startVideoInput(videoDevices[0].deviceId);
                    } catch (videoErr) {
                        console.warn("[Video] Preferred device unavailable, trying first available:", videoErr);
                        const fallback = videoDevices[0]?.deviceId;
                        if (fallback) {
                            await sess.audioVideo.startVideoInput(fallback);
                        }
                    }
                }
            }
            sess.audioVideo.startLocalVideoTile();
        }
        setCameraOn((v) => {
            const next = !v;
            try { sessionStorage.setItem(`callCamOn_${requestId}`, String(next)); } catch { /* quota */ }
            return next;
        });
    }, [cameraOn, requestId, backgroundBlurOn, sessionRef]);

    // ── Toggle noise cancellation ────────────────────────────────────────────
    const toggleNoiseCancellation = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        const rawId = rawAudioDeviceIdRef.current ?? selectedAudioInput;
        if (noiseCancellationOn) {
            // Turn OFF → optimistic UI then switch to raw mic
            setNoiseCancellationOn(false);
            if (rawId) {
                try {
                    await sess.audioVideo.startAudioInput(rawId);
                } catch (audioErr) {
                    console.warn("[Audio] Preferred device unavailable, falling back:", audioErr);
                    const audioDevices = await sess.audioVideo.listAudioInputDevices();
                    const fallback = audioDevices[0]?.deviceId;
                    if (fallback) {
                        await sess.audioVideo.startAudioInput(fallback);
                        rawAudioDeviceIdRef.current = fallback;
                        setSelectedAudioInput(fallback);
                    } else {
                        // Roll back UI if no fallback
                        setNoiseCancellationOn(true);
                        notifications.show({
                            title: "Error",
                            message: "No microphone detected",
                            color: "yellow",
                            icon: <IconAlertCircle size={18} />,
                        });
                    }
                }
            }
        } else {
            // Turn ON → reuse existing VF device or create a new one
            if (!rawId) {
                notifications.show({
                    title: "Not available",
                    message: "No microphone detected",
                    color: "yellow",
                    icon: <IconAlertCircle size={18} />,
                });
                return;
            }
            // Optimistic UI
            setNoiseCancellationOn(true);
            try {
                // Try reusing existing VF device first
                let vfDevice = vfDeviceRef.current;
                if (vfDevice) {
                    await sess.audioVideo.startAudioInput(vfDevice);
                    return;
                }
                // Otherwise, create transformer + device from scratch
                let transformer = vfTransformerRef.current;
                if (!transformer) {
                    const logger = new ConsoleLogger("VoiceFocus", LogLevel.WARN);
                    const isSupported = await VoiceFocusDeviceTransformer.isSupported(undefined, { logger });
                    if (!isSupported) {
                        throw new Error("Voice Focus not supported on this browser");
                    }
                    transformer = await VoiceFocusDeviceTransformer.create(
                        { variant: "auto" },
                        { logger },
                    );
                    vfTransformerRef.current = transformer;
                }
                vfDevice = (await transformer.createTransformDevice(rawId)) ?? null;
                if (vfDevice) {
                    vfDeviceRef.current = vfDevice as VoiceFocusTransformDevice;
                    await sess.audioVideo.startAudioInput(vfDevice);
                } else {
                    setNoiseCancellationOn(false);
                    notifications.show({
                        title: "Not available",
                        message: "Failed to create noise cancellation device",
                        color: "yellow",
                        icon: <IconAlertCircle size={18} />,
                    });
                }
            } catch (err) {
                setNoiseCancellationOn(false);
                console.error("Voice Focus toggle error:", err);
                notifications.show({
                    title: "Error",
                    message: "Failed to toggle noise cancellation",
                    color: "red",
                    icon: <IconX size={18} />,
                });
            }
        }
    }, [noiseCancellationOn, selectedAudioInput, sessionRef]);

    // ── Toggle background blur ───────────────────────────────────────────────
    const toggleBackgroundBlur = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess || !cameraOn) return;

        const currentVideoId = selectedVideoInput;
        if (!currentVideoId) return;

        if (backgroundBlurOn) {
            // Turn OFF → swap to raw camera immediately, then clean up the
            // old transform device in the background.
            setBackgroundBlurOn(false);
            try {
                const oldTransform = blurTransformDeviceRef.current;
                blurTransformDeviceRef.current = null;
                blurProcessorRef.current = null;
                sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                await sess.audioVideo.startVideoInput(currentVideoId);
                // Rebind the local <video> element so the PIP picks up the
                // new (non-blurred) stream immediately.
                if (localTileIdRef.current !== null && localVideoRef.current) {
                    sess.audioVideo.bindVideoElement(localTileIdRef.current, localVideoRef.current);
                }
                // Clean up the old transform device async
                if (oldTransform) {
                    void oldTransform.stop();
                }
            } catch (err) {
                console.error("Failed to disable background blur:", err);
            }
        } else {
            // Turn ON → wrap camera with blur processor
            setBackgroundBlurOn(true);
            try {
                let blurProcessor = blurProcessorRef.current;
                if (!blurProcessor) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const spec = {
                        paths: {
                            asset: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.13.0",
                            model: "https://sdk-bgblur-models.s3.us-east-1.amazonaws.com",
                            worker: "https://sdk-bgblur-wasm.s3.us-east-1.amazonaws.com/workers/",
                        },
                    } as unknown as BackgroundFilterSpec;
                    const logger = createBlurLogger();
                    const isSupported = await BackgroundBlurVideoFrameProcessor.isSupported(spec, { logger });
                    if (!isSupported) {
                        throw new Error("Background blur not supported");
                    }
                    blurProcessor = await BackgroundBlurVideoFrameProcessor.create(spec, {
                        blurStrength: 25,
                        logger,
                    }) ?? null;
                    blurProcessorRef.current = blurProcessor;
                }
                sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                if (!blurProcessor) throw new Error("Background blur processor failed to initialize");
                const transformDevice = new DefaultVideoTransformDevice(
                    createBlurLogger(),
                    currentVideoId,
                    [blurProcessor],
                );
                blurTransformDeviceRef.current = transformDevice;
                await sess.audioVideo.startVideoInput(transformDevice);
                // Rebind so the PIP shows the blurred stream immediately.
                if (localTileIdRef.current !== null && localVideoRef.current) {
                    sess.audioVideo.bindVideoElement(localTileIdRef.current, localVideoRef.current);
                }
            } catch (err) {
                setBackgroundBlurOn(false);
                console.error("Background blur toggle error:", err);
                notifications.show({
                    title: "Error",
                    message: "Failed to enable background blur",
                    color: "red",
                    icon: <IconX size={18} />,
                });
            }
        }
    }, [backgroundBlurOn, cameraOn, selectedVideoInput, sessionRef, localTileIdRef, localVideoRef]);

    // ── Toggle screen sharing ────────────────────────────────────────────────
    const toggleScreenShare = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        // Read the ref for the latest value
        if (screenShareOnRef.current) {
            sess.audioVideo.stopContentShare();
            screenShareOnRef.current = false;
            setScreenShareOn(false);
        } else {
            try {
                await sess.audioVideo.startContentShareFromScreenCapture();
                notifications.show({
                    title: "Screen sharing",
                    message: "You are now sharing your screen.",
                    color: "teal",
                    icon: <IconScreenShare size={18} />,
                    autoClose: 3000,
                });
            } catch (err) {
                const msg = (err as Error)?.message ?? "";
                if (!msg.includes("Permission denied") && !msg.includes("AbortError") && !msg.includes("NotAllowedError")) {
                    notifications.show({
                        title: "Error",
                        message: "Failed to start screen sharing",
                        color: "red",
                        icon: <IconX size={18} />,
                    });
                }
            }
        }
    }, [sessionRef, screenShareOnRef]);

    // ── Switch audio input device ────────────────────────────────────────────
    const switchAudioInput = useCallback(async (deviceId: string) => {
        const sess = sessionRef.current;
        if (!sess) return;
        try {
            // If noise cancellation is on, wrap the new device with Voice Focus
            if (noiseCancellationOn && vfTransformerRef.current) {
                const vfDevice = await vfTransformerRef.current.createTransformDevice(deviceId);
                if (vfDevice) {
                    vfDeviceRef.current = vfDevice;
                    await sess.audioVideo.startAudioInput(vfDevice);
                } else {
                    await sess.audioVideo.startAudioInput(deviceId);
                }
            } else {
                await sess.audioVideo.startAudioInput(deviceId);
            }
            setSelectedAudioInput(deviceId);
            rawAudioDeviceIdRef.current = deviceId;
            if (!micOn) {
                await sess.audioVideo.realtimeUnmuteLocalAudio();
                setMicOn(true);
            }
        } catch {
            notifications.show({ title: "Error", message: "Failed to switch microphone", color: "red", icon: <IconX size={18} /> });
        }
    }, [micOn, noiseCancellationOn, sessionRef]);

    // ── Switch video input device ────────────────────────────────────────────
    const switchVideoInput = useCallback(async (deviceId: string) => {
        const sess = sessionRef.current;
        if (!sess) return;
        try {
            sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
            // Apply background blur if enabled
            if (backgroundBlurOn && blurProcessorRef.current) {
                const transformDevice = new DefaultVideoTransformDevice(
                    createBlurLogger(),
                    deviceId,
                    [blurProcessorRef.current],
                );
                blurTransformDeviceRef.current = transformDevice;
                await sess.audioVideo.startVideoInput(transformDevice);
            } else {
                await sess.audioVideo.startVideoInput(deviceId);
            }
            setSelectedVideoInput(deviceId);
            if (!cameraOn) {
                sess.audioVideo.startLocalVideoTile();
                setCameraOn(true);
            }
        } catch {
            notifications.show({ title: "Error", message: "Failed to switch camera", color: "red", icon: <IconX size={18} /> });
        }
    }, [cameraOn, backgroundBlurOn, sessionRef]);

    return {
        // State
        micOn,
        cameraOn,
        noiseCancellationOn,
        backgroundBlurOn,
        screenShareOn,
        selectedAudioInput,
        selectedVideoInput,
        // Setters
        setMicOn,
        setCameraOn,
        setNoiseCancellationOn,
        setBackgroundBlurOn,
        setScreenShareOn,
        setSelectedAudioInput,
        setSelectedVideoInput,
        // Refs
        vfTransformerRef,
        vfDeviceRef,
        rawAudioDeviceIdRef,
        blurProcessorRef,
        blurTransformDeviceRef,
        // Actions
        toggleMic,
        toggleCamera,
        toggleNoiseCancellation,
        toggleBackgroundBlur,
        toggleScreenShare,
        switchAudioInput,
        switchVideoInput,
    };
}
