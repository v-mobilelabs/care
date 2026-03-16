"use client";
/**
 * _use-meeting-session.ts
 *
 * Encapsulates the full Chime session lifecycle:
 *  - Session creation (logger, device controller, config, observers)
 *  - Audio + video device startup (delegates to VF and blur hooks via callbacks)
 *  - Connection health tracking
 *  - Auto-reconnection with exponential backoff
 *  - 45-second safety timeout (using statusRef to avoid stale-closure bugs)
 *  - Cleanup on unmount
 *
 * Returns `sessionRef` and all derived state that the rest of the room needs.
 */
import {
    DefaultDeviceController,
    DefaultEventController,
    DefaultMeetingSession,
    LogLevel,
    MeetingSessionConfiguration,
    MeetingSessionStatusCode,
    NoOpEventReporter,
    VideoAdaptiveProbePolicy,
    type ContentShareObserver,
    type MeetingSessionStatus,
    type VideoTileState,
    ConsoleLogger,
} from "amazon-chime-sdk-js";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef, useState } from "react";
import type { AttendeeJoinInfo } from "@/data/meet";
import type { ConnectionHealth } from "./_room-types";

// ── ChimeLogger ───────────────────────────────────────────────────────────────

/**
 * ConsoleLogger subclass that suppresses known, non-actionable Chime errors.
 */
class ChimeLogger extends ConsoleLogger {
    override error(msg: string): void {
        if (msg.includes("session will not be reconnected")) return;
        if (msg.includes("Unhandled type received while flattening attributes")) return;
        if (msg.includes("SignalingChannelClosedUnexpectedly")) return;
        if (msg.includes("MeetingEnded")) return;
        if (msg.includes("AudioJoinedFromAnotherDevice")) return;
        if (msg.includes("OverconstrainedError")) return;
        super.error(msg);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function stopSession(sess: DefaultMeetingSession): Promise<void> {
    try { await sess.audioVideo.stopVideoInput(); } catch { /* ignore */ }
    try { await sess.audioVideo.stopAudioInput(); } catch { /* ignore */ }
    try { sess.audioVideo.stop(); } catch { /* ignore */ }
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INIT_TIMEOUT_MS = 45_000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionStatus = "initialising" | "ready" | "error";
export type TeardownReason = "user" | "remote-rtdb" | "chime-ended" | "chime-kicked";

export interface UseMeetingSessionParams {
    joinInfo: AttendeeJoinInfo;
    requestId: string;
    /** Incremented by retry button / auto-reconnect to re-run the init effect. */
    retryCount: number;
    setRetryCount: React.Dispatch<React.SetStateAction<number>>;
    initialMicOn: boolean;
    initialCameraOn: boolean;
    initialAudioDeviceId?: string | null;
    initialVideoDeviceId?: string | null;
    /** Ref written to once the Chime session is started. */
    callStartTimeRef: React.MutableRefObject<number>;
    // ── DOM element refs ─────────────────────────────────────────────────
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    localTileIdRef: React.MutableRefObject<number | null>;
    contentShareVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
    // ── Audio level refs (written by Chime volume callbacks) ─────────────
    localAudioLevelRef: React.MutableRefObject<number>;
    remoteAudioLevelRef: React.MutableRefObject<number>;
    // ── Screen share ─────────────────────────────────────────────────────
    screenShareOnRef: React.MutableRefObject<boolean>;
    setScreenShareOn: (on: boolean) => void;
    // ── Teardown ─────────────────────────────────────────────────────────
    /** Idempotent teardown from the parent (handles RTDB signals, navigation, feedback modal). */
    teardown: (reason: TeardownReason) => void;
    // ── VF + Blur callbacks (from useVoiceFocusTransformer / useBackgroundProcessor) ──
    startAudioInput: (params: {
        sess: DefaultMeetingSession;
        preferredAudioId: string;
        audioDevices: MediaDeviceInfo[];
        cancelled: () => boolean;
        initCountRef: React.MutableRefObject<number>;
        myInitId: number;
    }) => Promise<boolean>;
    startVideoInput: (params: {
        sess: DefaultMeetingSession;
        preferredVideoId: string;
        videoDevices: MediaDeviceInfo[];
        logger: ConsoleLogger;
        cancelled: () => boolean;
    }) => Promise<boolean>;
    setNoiseCancellationOn: (on: boolean) => void;
    setBackgroundBlurOn: (on: boolean) => void;
}

export interface UseMeetingSessionReturn {
    /** Current Chime session — null when not yet initialised or after teardown. */
    sessionRef: React.MutableRefObject<DefaultMeetingSession | null>;
    /** True once WE have initiated a stop — guards the audioVideoDidStop observer. */
    stoppedByUsRef: React.MutableRefObject<boolean>;
    /** Idempotency guard across the three teardown signal paths. */
    teardownCalledRef: React.MutableRefObject<boolean>;
    /** Counter incremented per init attempt — guards against superseded inits. */
    initCountRef: React.MutableRefObject<number>;
    status: SessionStatus;
    /** Ref mirror of status — avoids stale closure in the 45s timeout. */
    statusRef: React.MutableRefObject<SessionStatus>;
    errorMessage: string | null;
    connectionHealth: ConnectionHealth;
    setConnectionHealth: (health: ConnectionHealth) => void;
    remoteTileId: number | null;
    remoteScreenShareTileId: number | null;
    /** Device lists + selection — populated once the session is ready. */
    audioInputs: { value: string; label: string }[];
    videoInputs: { value: string; label: string }[];
    selectedAudioInput: string | null;
    setSelectedAudioInput: (id: string | null) => void;
    selectedVideoInput: string | null;
    setSelectedVideoInput: (id: string | null) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMeetingSession({
    joinInfo,
    requestId,
    retryCount,
    setRetryCount,
    initialMicOn,
    initialCameraOn,
    initialAudioDeviceId,
    initialVideoDeviceId,
    callStartTimeRef,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localTileIdRef,
    contentShareVideoRef,
    localAudioLevelRef,
    remoteAudioLevelRef,
    screenShareOnRef,
    setScreenShareOn,
    teardown,
    startAudioInput,
    startVideoInput,
    setNoiseCancellationOn,
    setBackgroundBlurOn,
}: UseMeetingSessionParams): UseMeetingSessionReturn {
    const sessionRef = useRef<DefaultMeetingSession | null>(null);
    const stoppedByUsRef = useRef(false);
    const teardownCalledRef = useRef(false);
    const initCountRef = useRef(0);
    const reconnectAttemptsRef = useRef(0);
    const isReconnectingRef = useRef(false);
    const connectionHealthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [status, setStatus] = useState<SessionStatus>("initialising");
    const statusRef = useRef<SessionStatus>("initialising");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>("good");
    const [remoteTileId, setRemoteTileId] = useState<number | null>(null);
    const [remoteScreenShareTileId, setRemoteScreenShareTileId] = useState<number | null>(null);
    const [audioInputs, setAudioInputs] = useState<{ value: string; label: string }[]>([]);
    const [videoInputs, setVideoInputs] = useState<{ value: string; label: string }[]>([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
    const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null);

    useEffect(() => {
        // Guard: skip if session is already running
        if (sessionRef.current && statusRef.current === "ready") {
            console.log("[Chime] Session is ready, skipping init");
            return;
        }

        // Clear state before retry
        if (statusRef.current === "error") {
            sessionRef.current = null;
        }

        console.log("[Chime] Starting new initialization, retryCount:", retryCount, "status:", statusRef.current);

        const myInitId = ++initCountRef.current;
        console.log("[Chime] Init ID:", myInitId);

        stoppedByUsRef.current = false;
        teardownCalledRef.current = false;
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

                if (cancelled) return;

                const eventController = new DefaultEventController(
                    config, logger, new NoOpEventReporter(),
                );
                const sess = new DefaultMeetingSession(config, logger, deviceController, eventController);

                // ── Observers ────────────────────────────────────────────
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
                            autoClose: 8000,
                        });
                    },
                    videoTileDidUpdate: (tileState: VideoTileState) => {
                        if (tileState.tileId === null) return;

                        if (tileState.isContent) {
                            if (!tileState.localTile && contentShareVideoRef.current) {
                                sess.audioVideo.bindVideoElement(tileState.tileId, contentShareVideoRef.current);
                                setRemoteScreenShareTileId(tileState.tileId);
                                contentShareVideoRef.current.play().catch(() => undefined);
                            }
                            return;
                        }

                        if (tileState.localTile && localVideoRef.current) {
                            localTileIdRef.current = tileState.tileId;
                            sess.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                            localVideoRef.current.play().catch(() => undefined);
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

                        // Recoverable — auto-reconnect with exponential backoff
                        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                            console.warn(`[Chime] Session stopped (code ${code}). Reconnect ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}…`);
                            reconnectAttemptsRef.current += 1;
                            isReconnectingRef.current = true;
                            setConnectionHealth("reconnecting");

                            sessionRef.current = null;
                            stopSession(sess).catch(() => undefined);

                            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16_000);
                            setTimeout(() => {
                                if (teardownCalledRef.current) return;
                                setRetryCount((c) => c + 1);
                            }, delay);
                        } else {
                            console.error(`[Chime] Max reconnect attempts reached. Ending call.`);
                            notifications.show({
                                title: "Connection lost",
                                message: "Unable to reconnect after multiple attempts.",
                                color: "red",
                            });
                            teardown("chime-ended");
                        }
                    },
                };
                sess.audioVideo.addObserver(observer);

                // ── Content share observer ────────────────────────────────
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

                // ── Device enumeration ────────────────────────────────────
                console.log("[Chime] Enumerating devices...");
                const [audioDevices, videoDevices] = await Promise.all([
                    sess.audioVideo.listAudioInputDevices(),
                    sess.audioVideo.listVideoInputDevices(),
                ]);
                console.log("[Chime] Devices:", audioDevices.length, "audio,", videoDevices.length, "video");

                if (cancelled) {
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                // ── Audio input (Voice Focus or plain) ────────────────────
                const preferredAudioId = (
                    initialAudioDeviceId && audioDevices.some((d) => d.deviceId === initialAudioDeviceId)
                        ? initialAudioDeviceId
                        : audioDevices[0]?.deviceId ?? null
                );

                if (preferredAudioId) {
                    if (cancelled || initCountRef.current !== myInitId) {
                        stoppedByUsRef.current = true;
                        await stopSession(sess);
                        return;
                    }
                    const noiseCancellationActive = await startAudioInput({
                        sess,
                        preferredAudioId,
                        audioDevices,
                        cancelled: () => cancelled,
                        initCountRef,
                        myInitId,
                    });
                    setNoiseCancellationOn(noiseCancellationActive);
                }

                // ── Video input (background blur or plain) ────────────────
                const preferredVideoId = (
                    initialVideoDeviceId && videoDevices.some((d) => d.deviceId === initialVideoDeviceId)
                        ? initialVideoDeviceId
                        : videoDevices[0]?.deviceId ?? null
                );

                if (initialCameraOn && preferredVideoId) {
                    if (cancelled) {
                        stoppedByUsRef.current = true;
                        await stopSession(sess);
                        return;
                    }
                    const backgroundBlurActive = await startVideoInput({
                        sess,
                        preferredVideoId,
                        videoDevices,
                        logger,
                        cancelled: () => cancelled,
                    });
                    setBackgroundBlurOn(backgroundBlurActive);
                }

                if (cancelled) {
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                // ── Guard: only the latest init may take session ownership ─
                if (initCountRef.current !== myInitId) {
                    console.log("[Chime] Init", myInitId, "superseded, cleaning up");
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                sessionRef.current = sess;
                initSession = sess;

                // Persist call start time (survives page reload)
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
                        autoClose: 3000,
                    });
                }

                // Bind remote audio element (without this, neither side can hear the other)
                if (remoteAudioRef.current) {
                    sess.audioVideo.bindAudioElement(remoteAudioRef.current);
                }

                // Honour pre-join lobby choices
                if (initialCameraOn) sess.audioVideo.startLocalVideoTile();
                if (!initialMicOn) sess.audioVideo.realtimeMuteLocalAudio();

                statusRef.current = "ready";
                setStatus("ready");
                console.log("[Chime] Status: ready");

                // Populate settings device lists
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
                                    if (muted != null) {
                                        // setRemoteMuted is in _room.tsx — surfaced via the observer if needed
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
                console.log("[Chime] Init", myInitId, "complete");
            }
        };

        void init();

        // 45-second safety timeout — uses statusRef to avoid stale closure
        const timeout = setTimeout(() => {
            if (!cancelled && statusRef.current === "initialising" && initStarted && initCountRef.current === myInitId) {
                console.error("[Chime] Init", myInitId, "timed out after 45s");
                statusRef.current = "error";
                setErrorMessage("Connection timed out. Please try again.");
                setStatus("error");
                if (sessionRef.current) {
                    stoppedByUsRef.current = true;
                    const sess = sessionRef.current;
                    sessionRef.current = null;
                    stopSession(sess).catch((e) => console.error("[Chime] Timeout cleanup error:", e));
                }
            }
        }, INIT_TIMEOUT_MS);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            console.log("[Chime] Init", myInitId, "cleanup, cancelled =", cancelled);
            const sess = sessionRef.current;
            if (sess) {
                stoppedByUsRef.current = true;
                sessionRef.current = null;
                stopSession(sess).catch((e) => console.error("[Chime] Cleanup error:", e));
            }
        };
        // retryCount is the only trigger — joinInfo is stable after the room mounts
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    return {
        sessionRef,
        stoppedByUsRef,
        teardownCalledRef,
        initCountRef,
        status,
        statusRef,
        errorMessage,
        connectionHealth,
        setConnectionHealth,
        remoteTileId,
        remoteScreenShareTileId,
        audioInputs,
        videoInputs,
        selectedAudioInput,
        setSelectedAudioInput,
        selectedVideoInput,
        setSelectedVideoInput,
    };
}
