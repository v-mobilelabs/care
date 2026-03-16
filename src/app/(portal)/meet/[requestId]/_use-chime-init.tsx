"use client";
/**
 * _use-chime-init.ts — Encapsulates the full Chime session initialisation lifecycle.
 *
 * Responsible for:
 *  - Building the MeetingSessionConfiguration + session objects
 *  - Adding all audioVideo observers (tiles, connection health, audioVideoDidStop)
 *  - Enumerating devices and starting audio/video with VF + blur fallbacks
 *  - 45-second safety timeout
 *  - Auto-reconnect with exponential backoff
 *  - Proper cleanup on unmount / React StrictMode double-invoke
 *
 * Kept separate from the device-control toggles (useDeviceControls) so each
 * hook has a single responsibility.
 */
import {
    BackgroundBlurVideoFrameProcessor,
    ConsoleLogger,
    DefaultDeviceController,
    DefaultEventController,
    DefaultMeetingSession,
    DefaultVideoTransformDevice,
    LogLevel,
    MeetingSessionConfiguration,
    MeetingSessionStatusCode,
    NoOpEventReporter,
    VideoAdaptiveProbePolicy,
    VoiceFocusDeviceTransformer,
    type BackgroundBlurProcessor,
    type ContentShareObserver,
    type MeetingSessionStatus,
    type VideoTileState,
} from "amazon-chime-sdk-js";
import { notifications } from "@mantine/notifications";
import { IconWifi, IconWifiOff } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { AttendeeJoinInfo } from "@/data/meet";
import { ChimeLogger, stopSession, withTimeout } from "./_room-helpers";
import type { ConnectionHealth, TeardownReason } from "./_room-types"; // TeardownReason added to _room-types.ts

// ── Convenience type alias ───────────────────────────────────────────────────
type VfDevice = ReturnType<VoiceFocusDeviceTransformer["createTransformDevice"]> extends Promise<infer T> ? T : never;

const MAX_RECONNECT_ATTEMPTS = 5;
const INIT_TIMEOUT_MS = 45_000;

// ── Params ───────────────────────────────────────────────────────────────────

export interface UseChimeInitParams {
    // Core meeting identity
    joinInfo: AttendeeJoinInfo;
    requestId: string;
    /** Incremented on each retry/reconnect attempt to re-trigger the effect. */
    retryCount: number;
    setRetryCount: React.Dispatch<React.SetStateAction<number>>;
    // Pre-join lobby preferences
    initialMicOn: boolean;
    initialCameraOn: boolean;
    initialAudioDeviceId?: string | null;
    initialVideoDeviceId?: string | null;
    // ── Shared refs (owned by MeetingRoom, passed to both this hook and useCallLifecycle) ──
    sessionRef: React.MutableRefObject<DefaultMeetingSession | null>;
    stoppedByUsRef: React.MutableRefObject<boolean>;
    callStartTimeRef: React.MutableRefObject<number>;
    // ── DOM element refs ────────────────────────────────────────────────────
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    localTileIdRef: React.MutableRefObject<number | null>;
    contentShareVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    // ── Audio level refs ────────────────────────────────────────────────────
    localAudioLevelRef: React.MutableRefObject<number>;
    remoteAudioLevelRef: React.MutableRefObject<number>;
    setRemoteMuted: React.Dispatch<React.SetStateAction<boolean>>;
    // ── Screen share ────────────────────────────────────────────────────────
    screenShareOnRef: React.MutableRefObject<boolean>;
    setScreenShareOn: React.Dispatch<React.SetStateAction<boolean>>;
    // ── Teardown (from useCallLifecycle) ────────────────────────────────────
    teardown: (reason: TeardownReason) => void;
    // ── Device refs/setters (from useDeviceControls) ────────────────────────
    vfTransformerRef: React.MutableRefObject<VoiceFocusDeviceTransformer | null>;
    vfDeviceRef: React.MutableRefObject<VfDevice>;
    rawAudioDeviceIdRef: React.MutableRefObject<string | null>;
    blurProcessorRef: React.MutableRefObject<BackgroundBlurProcessor | null>;
    blurTransformDeviceRef: React.MutableRefObject<DefaultVideoTransformDevice | null>;
    setNoiseCancellationOn: React.Dispatch<React.SetStateAction<boolean>>;
    setBackgroundBlurOn: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedAudioInput: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedVideoInput: React.Dispatch<React.SetStateAction<string | null>>;
}

// ── Return ───────────────────────────────────────────────────────────────────

export interface UseChimeInitReturn {
    // Init tracking
    initCountRef: React.MutableRefObject<number>;
    reconnectAttemptsRef: React.MutableRefObject<number>;
    isReconnectingRef: React.MutableRefObject<boolean>;
    // Session status
    status: "initialising" | "ready" | "error";
    /** Ref mirror — avoids stale closures in the 45s timeout. */
    statusRef: React.MutableRefObject<"initialising" | "ready" | "error">;
    setStatus: React.Dispatch<React.SetStateAction<"initialising" | "ready" | "error">>;
    errorMessage: string | null;
    setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
    // Tile IDs for remote participant
    remoteTileId: number | null;
    remoteScreenShareTileId: number | null;
    // Populated device lists for ControlBar settings
    audioInputs: { value: string; label: string }[];
    videoInputs: { value: string; label: string }[];
    // Connection health
    connectionHealth: ConnectionHealth;
    setConnectionHealth: React.Dispatch<React.SetStateAction<ConnectionHealth>>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChimeInit({
    joinInfo,
    requestId,
    retryCount,
    setRetryCount,
    initialMicOn,
    initialCameraOn,
    initialAudioDeviceId,
    initialVideoDeviceId,
    sessionRef,
    stoppedByUsRef,
    callStartTimeRef,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localTileIdRef,
    contentShareVideoRef,
    localAudioLevelRef,
    remoteAudioLevelRef,
    setRemoteMuted,
    screenShareOnRef,
    setScreenShareOn,
    teardown,
    vfTransformerRef,
    vfDeviceRef,
    rawAudioDeviceIdRef,
    blurProcessorRef,
    blurTransformDeviceRef,
    setNoiseCancellationOn,
    setBackgroundBlurOn,
    setSelectedAudioInput,
    setSelectedVideoInput,
}: UseChimeInitParams): UseChimeInitReturn {
    const initCountRef = useRef(0);
    const reconnectAttemptsRef = useRef(0);
    const isReconnectingRef = useRef(false);
    const connectionHealthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [status, setStatus] = useState<"initialising" | "ready" | "error">("initialising");
    const statusRef = useRef<"initialising" | "ready" | "error">("initialising");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [remoteTileId, setRemoteTileId] = useState<number | null>(null);
    const [remoteScreenShareTileId, setRemoteScreenShareTileId] = useState<number | null>(null);
    const [audioInputs, setAudioInputs] = useState<{ value: string; label: string }[]>([]);
    const [videoInputs, setVideoInputs] = useState<{ value: string; label: string }[]>([]);
    const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>("good");

    useEffect(() => {
        // Guard: skip if a session is already running
        if (sessionRef.current && statusRef.current === "ready") {
            console.log("[Chime] Session is ready, skipping init");
            return;
        }
        // Clear stale session ref before retry
        if (statusRef.current === "error") {
            console.log("[Chime] Retrying after error, clearing stale refs");
            sessionRef.current = null;
        }

        console.log("[Chime] Starting new initialization, retryCount:", retryCount, "status:", statusRef.current);
        const myInitId = ++initCountRef.current;
        console.log("[Chime] Init ID:", myInitId);

        stoppedByUsRef.current = false;
        reconnectAttemptsRef.current = 0;
        isReconnectingRef.current = false;

        let cancelled = false;
        let initSession: DefaultMeetingSession | null = null;
        let initStarted = false;

        const init = async () => {
            try {
                initStarted = true;
                console.log("[Chime] Starting initialization...");

                const logger = new ChimeLogger("Chime", LogLevel.WARN);
                const deviceController = new DefaultDeviceController(logger, { enableWebAudio: true });

                const config = new MeetingSessionConfiguration(
                    {
                        MeetingId: joinInfo.meeting.MeetingId,
                        MediaRegion: joinInfo.meeting.MediaRegion,
                        MediaPlacement: joinInfo.meeting.MediaPlacement,
                        ...(joinInfo.meeting.ExternalMeetingId !== undefined && {
                            ExternalMeetingId: joinInfo.meeting.ExternalMeetingId,
                        }),
                    },
                    {
                        AttendeeId: joinInfo.attendee.AttendeeId,
                        ExternalUserId: joinInfo.attendee.ExternalUserId,
                        JoinToken: joinInfo.attendee.JoinToken,
                    },
                );

                config.enableSimulcastForUnifiedPlanChromiumBasedBrowsers = true;
                config.videoDownlinkBandwidthPolicy = new VideoAdaptiveProbePolicy(logger);
                config.reconnectTimeoutMs = 30_000;

                if (cancelled) {
                    console.log("[Chime] Init cancelled before session creation, stopping");
                    return;
                }

                const eventController = new DefaultEventController(config, logger, new NoOpEventReporter());
                const sess = new DefaultMeetingSession(config, logger, deviceController, eventController);

                // ── AudioVideo observers ──────────────────────────────────────
                const observer = {
                    connectionDidBecomePoor: () => {
                        setConnectionHealth("poor");
                        if (connectionHealthTimeoutRef.current) clearTimeout(connectionHealthTimeoutRef.current);
                        connectionHealthTimeoutRef.current = setTimeout(() => setConnectionHealth("good"), 10_000);
                    },
                    connectionDidBecomeGood: () => {
                        if (connectionHealthTimeoutRef.current) clearTimeout(connectionHealthTimeoutRef.current);
                        setConnectionHealth("good");
                    },
                    connectionDidSuggestStopVideo: () => {
                        setConnectionHealth("poor");
                        notifications.show({
                            title: "Unstable connection",
                            message: "Consider turning off your camera for better audio quality.",
                            color: "yellow",
                            icon: <IconWifi size={18} />,
                            autoClose: 8000,
                        });
                    },
                    videoTileDidUpdate: (tileState: VideoTileState) => {
                        if (tileState.tileId === null) return;

                        if (tileState.isContent) {
                            if (!tileState.localTile && contentShareVideoRef.current) {
                                sess.audioVideo.bindVideoElement(tileState.tileId, contentShareVideoRef.current);
                                setRemoteScreenShareTileId(tileState.tileId);
                                contentShareVideoRef.current.play().catch(() => { });
                            }
                            return;
                        }

                        if (tileState.localTile && localVideoRef.current) {
                            localTileIdRef.current = tileState.tileId;
                            sess.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                            localVideoRef.current.play().catch(() => { });
                        } else if (!tileState.localTile && remoteVideoRef.current) {
                            sess.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                            setRemoteTileId(tileState.tileId);
                        }
                    },
                    videoTileWasRemoved: (tileId: number) => {
                        setRemoteTileId((prev) => (prev === tileId ? null : prev));
                        setRemoteScreenShareTileId((prev) => (prev === tileId ? null : prev));
                    },
                    audioVideoDidStop: (sessionStatus: MeetingSessionStatus) => {
                        if (sessionRef.current !== sess) return;
                        const code = sessionStatus.statusCode();

                        if (code === MeetingSessionStatusCode.AudioJoinedFromAnotherDevice) {
                            teardown("chime-kicked");
                            return;
                        }

                        if (stoppedByUsRef.current) return;

                        const terminalCodes = new Set([
                            MeetingSessionStatusCode.MeetingEnded,
                            MeetingSessionStatusCode.Left,
                            MeetingSessionStatusCode.AudioJoinedFromAnotherDevice,
                            MeetingSessionStatusCode.AudioDisconnectAudio,
                        ]);

                        if (terminalCodes.has(code)) {
                            teardown("chime-ended");
                            return;
                        }

                        // Recoverable — exponential backoff reconnect
                        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                            console.warn(`[Chime] Session stopped (code ${code}). Attempting reconnect ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}…`);
                            reconnectAttemptsRef.current += 1;
                            isReconnectingRef.current = true;
                            setConnectionHealth("reconnecting");
                            sessionRef.current = null;
                            void stopSession(sess).catch(() => { });
                            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16_000);
                            setTimeout(() => {
                                // Use stoppedByUsRef as proxy for "teardown was called"
                                if (stoppedByUsRef.current) return;
                                setRetryCount((c) => c + 1);
                            }, delay);
                        } else {
                            console.error(`[Chime] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Ending call.`);
                            notifications.show({
                                title: "Connection lost",
                                message: "Unable to reconnect after multiple attempts.",
                                color: "red",
                                icon: <IconWifiOff size={18} />,
                            });
                            teardown("chime-ended");
                        }
                    },
                };
                sess.audioVideo.addObserver(observer);

                // ── Content share observer ─────────────────────────────────
                const contentShareObserver: ContentShareObserver = {
                    contentShareDidStart: () => {
                        screenShareOnRef.current = true;
                        setScreenShareOn(true);
                    },
                    contentShareDidStop: () => {
                        screenShareOnRef.current = false;
                        setScreenShareOn(false);
                    },
                };
                sess.audioVideo.addContentShareObserver(contentShareObserver);

                // ── Device enumeration ─────────────────────────────────────
                console.log("[Chime] Enumerating audio/video devices...");
                const [audioDevices, videoDevices] = await Promise.all([
                    sess.audioVideo.listAudioInputDevices(),
                    sess.audioVideo.listVideoInputDevices(),
                ]);
                console.log("[Chime] Devices enumerated:", audioDevices.length, "audio,", videoDevices.length, "video");

                if (cancelled) {
                    console.log("[Chime] Init cancelled during device enumeration, cleaning up");
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                // ── Audio input (Voice Focus with fallback) ──────────────
                console.log("[Chime] Starting audio input setup...");
                let noiseCancellationActive = false;
                const preferredAudioId = (initialAudioDeviceId && audioDevices.some((d) => d.deviceId === initialAudioDeviceId))
                    ? initialAudioDeviceId
                    : audioDevices[0]?.deviceId ?? null;

                if (preferredAudioId) {
                    rawAudioDeviceIdRef.current = preferredAudioId;
                    if (cancelled) {
                        console.log("[Chime] Init cancelled before Voice Focus, stopping");
                        stoppedByUsRef.current = true;
                        await stopSession(sess);
                        return;
                    }
                    console.log("[Chime] Attempting Voice Focus init with timeout...");
                    try {
                        const vfResult = await withTimeout(
                            (async () => {
                                console.log("[VoiceFocus] Checking support...");
                                const isSupported = await VoiceFocusDeviceTransformer.isSupported(undefined, { logger });
                                console.log("[VoiceFocus] Supported:", isSupported);
                                if (!isSupported) return false;
                                console.log("[VoiceFocus] Creating transformer...");
                                const transformer = await VoiceFocusDeviceTransformer.create({ variant: "auto" }, { logger });
                                console.log("[VoiceFocus] Transformer created");
                                vfTransformerRef.current = transformer;
                                console.log("[VoiceFocus] Creating transform device...");
                                const vfDevice = await transformer.createTransformDevice(preferredAudioId);
                                if (vfDevice) {
                                    vfDeviceRef.current = vfDevice;
                                    console.log("[VoiceFocus] Starting audio input with VF device...");
                                    if (initCountRef.current !== myInitId) {
                                        console.log("[VoiceFocus] Init", myInitId, "superseded, aborting audio setup");
                                        return false;
                                    }
                                    await Promise.race([
                                        sess.audioVideo.startAudioInput(vfDevice),
                                        new Promise<never>((_, reject) =>
                                            setTimeout(() => reject(new Error("startAudioInput timeout")), 5000)
                                        ),
                                    ]);
                                    console.log("[VoiceFocus] Audio input started with noise cancellation");
                                    return true;
                                }
                                return false;
                            })(),
                            8_000,
                        );

                        if (vfResult === true) {
                            noiseCancellationActive = true;
                        } else {
                            if (vfResult === null) {
                                console.warn("[VoiceFocus] Timed out after 8s, falling back to raw mic");
                            }
                            if (cancelled) return;
                            if (initCountRef.current !== myInitId) return;
                            console.log("[Chime] Starting plain audio input (no VF)...");
                            try {
                                await sess.audioVideo.startAudioInput(preferredAudioId);
                                console.log("[Chime] Plain audio input started");
                            } catch (audioErr) {
                                console.warn("[Audio] Preferred device unavailable, falling back to default:", audioErr);
                                if (cancelled) return;
                                if (initCountRef.current !== myInitId) return;
                                const fallbackDevice = audioDevices[0]?.deviceId;
                                if (fallbackDevice) {
                                    await sess.audioVideo.startAudioInput(fallbackDevice);
                                    rawAudioDeviceIdRef.current = fallbackDevice;
                                    console.log("[Chime] Fallback audio input started");
                                }
                            }
                        }
                    } catch (vfErr) {
                        console.warn("[VoiceFocus] Init failed, falling back to raw mic:", vfErr);
                        if (cancelled) return;
                        if (initCountRef.current !== myInitId) return;
                        try {
                            await sess.audioVideo.startAudioInput(preferredAudioId);
                            console.log("[Chime] Plain audio input started after VF failure");
                        } catch (audioErr) {
                            console.warn("[Audio] Preferred device unavailable:", audioErr);
                            const fallbackDevice = audioDevices[0]?.deviceId;
                            if (fallbackDevice) {
                                await sess.audioVideo.startAudioInput(fallbackDevice);
                                rawAudioDeviceIdRef.current = fallbackDevice;
                            }
                        }
                    }
                }
                console.log("[Chime] Audio input setup complete, cancelled:", cancelled);

                // ── Video input (background blur with fallback) ──────────
                console.log("[Chime] Starting video input setup...");
                const preferredVideoId = (initialVideoDeviceId && videoDevices.some((d) => d.deviceId === initialVideoDeviceId))
                    ? initialVideoDeviceId
                    : videoDevices[0]?.deviceId ?? null;
                let backgroundBlurActive = false;

                if (initialCameraOn && preferredVideoId) {
                    sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                    if (cancelled) {
                        console.log("[Chime] Init cancelled before background blur, stopping");
                        stoppedByUsRef.current = true;
                        await stopSession(sess);
                        return;
                    }
                    try {
                        console.log("[BackgroundBlur] Checking support...");
                        const isBlurSupported = await BackgroundBlurVideoFrameProcessor.isSupported();
                        console.log("[BackgroundBlur] Supported:", isBlurSupported);

                        if (isBlurSupported) {
                            const blurProcessor = await BackgroundBlurVideoFrameProcessor.create(
                                undefined,
                                { blurStrength: 15, logger },
                            );
                            console.log("[BackgroundBlur] Processor created:", !!blurProcessor);
                            if (blurProcessor) {
                                blurProcessorRef.current = blurProcessor;
                                const transformDevice = new DefaultVideoTransformDevice(logger, preferredVideoId, [blurProcessor]);
                                blurTransformDeviceRef.current = transformDevice;
                                try {
                                    await sess.audioVideo.startVideoInput(transformDevice);
                                    console.log("[BackgroundBlur] Video input started with blur");
                                    backgroundBlurActive = true;
                                } catch (videoErr) {
                                    console.warn("[Video] Blur device failed, trying raw:", videoErr);
                                    if (cancelled) return;
                                    const fallbackVideo = videoDevices[0]?.deviceId;
                                    if (fallbackVideo) {
                                        await sess.audioVideo.startVideoInput(fallbackVideo);
                                    }
                                }
                            } else {
                                if (cancelled) return;
                                try {
                                    await sess.audioVideo.startVideoInput(preferredVideoId);
                                    console.log("[Chime] Plain video input started (no blur processor)");
                                } catch (videoErr) {
                                    console.warn("[Video] Preferred device unavailable:", videoErr);
                                    if (cancelled) return;
                                    const fallbackVideo = videoDevices[0]?.deviceId;
                                    if (fallbackVideo) await sess.audioVideo.startVideoInput(fallbackVideo);
                                }
                            }
                        } else {
                            if (cancelled) return;
                            try {
                                await sess.audioVideo.startVideoInput(preferredVideoId);
                                console.log("[Chime] Plain video input started (blur not supported)");
                            } catch (videoErr) {
                                console.warn("[Video] Preferred device unavailable:", videoErr);
                                if (cancelled) return;
                                const fallbackVideo = videoDevices[0]?.deviceId;
                                if (fallbackVideo) await sess.audioVideo.startVideoInput(fallbackVideo);
                            }
                        }
                    } catch (blurErr) {
                        console.warn("[BackgroundBlur] Init failed, falling back to raw camera:", blurErr);
                        if (cancelled) return;
                        try {
                            await sess.audioVideo.startVideoInput(preferredVideoId);
                            console.log("[Chime] Plain video input started after blur error");
                        } catch (videoErr) {
                            console.warn("[Video] Preferred device unavailable:", videoErr);
                            if (cancelled) return;
                            const fallbackVideo = videoDevices[0]?.deviceId;
                            if (fallbackVideo) await sess.audioVideo.startVideoInput(fallbackVideo);
                        }
                    }
                } else {
                    console.log("[Chime] Skipping video input (camera off or no device)");
                }
                console.log("[Chime] Video input setup complete, cancelled:", cancelled);

                if (cancelled) {
                    console.log("[Chime] Init cancelled before session start, cleaning up");
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                // Only the latest init may take session ownership
                if (initCountRef.current !== myInitId) {
                    console.log("[Chime] Init", myInitId, "superseded before session assignment, cleaning up");
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                sessionRef.current = sess;
                initSession = sess;
                console.log("[Chime] Session initialized successfully");

                // Restore or record call start time (survives page reload)
                const storageKey = `callStartedAt_${requestId}`;
                const stored = sessionStorage.getItem(storageKey);
                if (stored) {
                    callStartTimeRef.current = Number(stored);
                } else {
                    callStartTimeRef.current = Date.now();
                    sessionStorage.setItem(storageKey, String(callStartTimeRef.current));
                }

                console.log("[Chime] Starting audioVideo session...");
                sess.audioVideo.start();
                console.log("[Chime] AudioVideo session started");

                if (isReconnectingRef.current) {
                    isReconnectingRef.current = false;
                    reconnectAttemptsRef.current = 0;
                    setConnectionHealth("good");
                    notifications.show({
                        title: "Reconnected",
                        message: "Your connection has been restored.",
                        color: "teal",
                        icon: <IconWifi size={18} />,
                        autoClose: 3000,
                    });
                }

                // Bind remote audio element (without this, neither side can hear the other)
                console.log("[Chime] Binding remote audio element...");
                if (remoteAudioRef.current) {
                    sess.audioVideo.bindAudioElement(remoteAudioRef.current);
                    console.log("[Chime] Remote audio bound");
                }

                // Honour pre-join lobby choices
                console.log("[Chime] Setting initial device states...");
                if (initialCameraOn) sess.audioVideo.startLocalVideoTile();
                if (!initialMicOn) sess.audioVideo.realtimeMuteLocalAudio();

                setNoiseCancellationOn(noiseCancellationActive);
                setBackgroundBlurOn(backgroundBlurActive);

                console.log("[Chime] About to set status to ready...");
                statusRef.current = "ready";
                setStatus("ready");
                console.log("[Chime] Status set to ready");

                // Populate device lists for settings panel
                setAudioInputs(audioDevices.map((d) => ({ value: d.deviceId, label: d.label || "Microphone" })));
                setVideoInputs(videoDevices.map((d) => ({ value: d.deviceId, label: d.label || "Camera" })));
                setSelectedAudioInput(preferredAudioId ?? audioDevices[0]?.deviceId ?? null);
                setSelectedVideoInput(preferredVideoId ?? videoDevices[0]?.deviceId ?? null);

                // ── Audio level subscriptions ──────────────────────────────
                sess.audioVideo.realtimeSubscribeToVolumeIndicator(
                    joinInfo.attendee.AttendeeId,
                    (_id, volume) => { localAudioLevelRef.current = volume ?? 0; },
                );
                sess.audioVideo.realtimeSubscribeToAttendeeIdPresence(
                    (attendeeId, present) => {
                        if (attendeeId === joinInfo.attendee.AttendeeId) return;
                        if (present) {
                            sess.audioVideo.realtimeSubscribeToVolumeIndicator(
                                attendeeId,
                                (_id, volume, muted) => {
                                    remoteAudioLevelRef.current = volume ?? 0;
                                    if (muted !== null && muted !== undefined) {
                                        setRemoteMuted(muted);
                                    }
                                },
                            );
                        } else {
                            remoteAudioLevelRef.current = 0;
                        }
                    },
                );

            } catch (err) {
                if (!cancelled) {
                    console.error("[Chime] Init failed:", err);
                    console.error("[Chime] Error stack:", (err as Error)?.stack);
                    const errorMsg = (err as Error)?.message ?? "Failed to start video session.";
                    setErrorMessage(errorMsg);
                    statusRef.current = "error";
                    setStatus("error");
                    if (initSession) {
                        stoppedByUsRef.current = true;
                        sessionRef.current = null;
                        await stopSession(initSession).catch((e) => console.error("[Chime] Cleanup failed:", e));
                    }
                }
            } finally {
                console.log("[Chime] Init", myInitId, "finally block complete");
            }
        };

        void init();

        // 45-second safety timeout — reads statusRef to avoid stale closure
        const timeout = setTimeout(() => {
            if (!cancelled && statusRef.current === "initialising" && initStarted && initCountRef.current === myInitId) {
                console.error("[Chime] Init", myInitId, "timed out after 45s");
                console.error("[Chime] Status:", statusRef.current, "Session ref:", !!sessionRef.current);
                statusRef.current = "error";
                setErrorMessage("Connection timed out. Please try again.");
                setStatus("error");
                if (sessionRef.current) {
                    stoppedByUsRef.current = true;
                    const sess = sessionRef.current;
                    sessionRef.current = null;
                    stopSession(sess).catch((err) => console.error("[Chime] Timeout cleanup error:", err));
                }
            }
        }, INIT_TIMEOUT_MS);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            console.log("[Chime] Init", myInitId, "cleanup triggered, cancelled =", cancelled);
            const sess = sessionRef.current;
            if (sess) {
                console.log("[Chime] Stopping existing session in cleanup");
                stoppedByUsRef.current = true;
                sessionRef.current = null;
                stopSession(sess).catch((err) => console.error("[Chime] Cleanup error:", err));
            }
        };
        // joinInfo is stable; retryCount is the only intended trigger
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    return {
        initCountRef,
        reconnectAttemptsRef,
        isReconnectingRef,
        status,
        statusRef,
        setStatus,
        errorMessage,
        setErrorMessage,
        remoteTileId,
        remoteScreenShareTileId,
        audioInputs,
        videoInputs,
        connectionHealth,
        setConnectionHealth,
    };
}
