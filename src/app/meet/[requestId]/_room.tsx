"use client";
/**
 * _room.tsx — Chime SDK video meeting room.
 *
 * Features:
 *  - Adaptive bitrate (simulcast + VideoAdaptiveProbePolicy)
 *  - Voice Focus noise cancellation with graceful fallback
 *  - Real-time transcription (server-side Transcribe → client captions)
 *  - Session recording saved to Firebase Storage + call history
 *  - Proper media track release on disconnect (fixes camera light staying on)
 *
 * Dynamically imported (no SSR) to avoid `window` / Web Audio errors in Node.
 */
import {
    ConsoleLogger,
    DefaultDeviceController,
    DefaultEventController,
    DefaultMeetingSession,
    LogLevel,
    MeetingSessionConfiguration,
    MeetingSessionStatusCode,
    NoOpEventReporter,
    VideoAdaptiveProbePolicy,
    VoiceFocusDeviceTransformer,
    type MeetingSessionStatus,
    type TranscriptEvent,
    type VideoTileState,
} from "amazon-chime-sdk-js";
import {
    ActionIcon,
    Alert,
    Avatar,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Loader,
    Modal,
    Paper,
    Progress,
    ScrollArea,
    Select,
    Stack,
    Switch,
    Text,
    Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconArrowDown,
    IconArrowUp,
    IconCheck,
    IconClock,
    IconHome,
    IconMicrophone,
    IconMicrophoneOff,
    IconPhone,
    IconRecordMail,
    IconSettings,
    IconShieldCheck,
    IconVideo,
    IconVideoOff,
    IconWaveSine,
    IconWifi,
    IconUsers,
    IconX,
} from "@tabler/icons-react";
import { ref as dbRef, onValue, set as dbSet } from "firebase/database";
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AttendeeJoinInfo } from "@/data/meet";
import { firebaseApp, getClientDatabase } from "@/lib/firebase/client";
import { useEndCall } from "@/app/chat/connect/_query";
import { getInitials } from "@/lib/get-initials"
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
    name: string;
    photoUrl?: string | null;
}

interface RoomProps {
    requestId: string;
    joinInfo: AttendeeJoinInfo;
    localUser: Participant;
    remoteUser: Participant;
    /** Route to navigate to after the call ends (e.g. /doctor/dashboard or /chat/connect). */
    exitRoute: string;
    /** Whether the local user is a patient or doctor. */
    userKind: "patient" | "doctor";
    /** The Firebase UID of the local user — used to scope RTDB consent path. */
    localUserId: string;
    /** The doctorId for the call — used by the patient to respond to the consent invite. */
    doctorId: string | null;
    /** Initial mic state from the pre-join lobby (default: true). */
    initialMicOn?: boolean;
    /** Initial camera state from the pre-join lobby (default: true). */
    initialCameraOn?: boolean;
    /** Preferred audio input device ID selected in the pre-join lobby. */
    initialAudioDeviceId?: string | null;
    /** Preferred video input device ID selected in the pre-join lobby. */
    initialVideoDeviceId?: string | null;
    /** Called when the call ends (local or remote) to clean up persistent overlay state. */
    onEnd?: () => void;
    /** Called when the user wants to minimise the room (e.g. Home button) without ending the call. */
    onMinimize?: () => void;
}

interface TranscriptLine {
    id: string;
    text: string;
    isFinal: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * ConsoleLogger subclass that suppresses the "session will not be reconnected"
 * message. Chime emits this at ERROR level when we intentionally call stop()
 * (e.g. user hangs up, component unmounts). It is not an actionable error —
 * we already handle cleanup in stopSession() — so we drop it to keep the
 * console clean.
 */
class ChimeLogger extends ConsoleLogger {
    override error(msg: string): void {
        if (msg.includes("session will not be reconnected")) return;
        // Chime event-reporting pipeline throws this when it encounters a
        // non-primitive attribute value during metrics serialisation. It is
        // internal telemetry noise and has no effect on the call itself.
        if (msg.includes("Unhandled type received while flattening attributes")) return;
        // Chime signaling WebSocket closes normally when a meeting ends or the
        // user navigates away. This is expected teardown, not an actionable error.
        if (msg.includes("SignalingChannelClosedUnexpectedly")) return;
        // Chime logs this as an error when the host ends the meeting. It is
        // expected — audioVideoDidStop handles the disconnect/navigation.
        if (msg.includes("MeetingEnded")) return;
        // Chime fires this when the same user joins from a second device —
        // we handle it in audioVideoDidStop with a user-facing modal.
        if (msg.includes("AudioJoinedFromAnotherDevice")) return;
        super.error(msg);
    }
}

/**
 * Properly tear down a Chime session:
 * 1. Stop video input  → releases camera hardware (fixes "camera light stays on")
 * 2. Stop audio input  → releases microphone hardware
 * 3. Stop session      → closes WebRTC connection
 */
async function stopSession(sess: DefaultMeetingSession): Promise<void> {
    try { await sess.audioVideo.stopVideoInput(); } catch { /* ignore */ }
    try { await sess.audioVideo.stopAudioInput(); } catch { /* ignore */ }
    try { sess.audioVideo.stop(); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── Audio waveform visualiser ───────────────────────────────────────────────

const WAVE_BARS = 5;
const WAVE_WEIGHTS = [0.45, 0.75, 1, 0.75, 0.45] as const;

function AudioWaveform({
    levelRef,
    barHeight = 14,
    barWidth = 2.5,
    gap = 2,
}: Readonly<{
    levelRef: React.RefObject<number>;
    barHeight?: number;
    barWidth?: number;
    gap?: number;
}>) {
    const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

    useEffect(() => {
        let rafId: number;
        const minH = 1.5;
        const loop = () => {
            const t = Date.now() / 1000;
            const lvl = levelRef.current;
            barsRef.current.forEach((bar, i) => {
                if (!bar) return;
                const w = WAVE_WEIGHTS[i] ?? 1;
                const phase = (i / WAVE_BARS) * Math.PI * 2;
                let h: number;
                if (lvl > 0.02) {
                    const mod = 0.55 + 0.45 * Math.sin(t * 10 + phase);
                    h = minH + (barHeight - minH) * lvl * w * mod;
                } else {
                    h = minH + 1.2 * w * (0.5 + 0.5 * Math.sin(t * 1.8 + phase));
                }
                bar.style.height = `${Math.max(minH, Math.min(barHeight, h)).toFixed(1)}px`;
            });
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [levelRef, barHeight]);

    return (
        <Box style={{ display: "flex", alignItems: "center", gap }}>
            {Array.from({ length: WAVE_BARS }, (_, i) => (
                <span
                    key={i}
                    ref={(el) => { barsRef.current[i] = el; }}
                    style={{
                        display: "inline-block",
                        width: barWidth,
                        height: 1.5,
                        borderRadius: 2,
                        background: "rgba(52,211,153,0.9)",
                        willChange: "height",
                        transition: "height 0.05s linear",
                    }}
                />
            ))}
        </Box>
    );
}

// ── Main room component ───────────────────────────────────────────────────────

export function MeetingRoom({ requestId, joinInfo, localUser, remoteUser, exitRoute, userKind, localUserId, doctorId, initialMicOn = true, initialCameraOn = true, initialAudioDeviceId, initialVideoDeviceId, onEnd, onMinimize }: Readonly<RoomProps>) {
    const router = useRouter();
    const endCall = useEndCall();

    // Doctor's pending call queue — shows patients waiting while the doctor is on a call
    const callQueue = useDoctorCallQueue(userKind === "doctor" ? localUserId : undefined);
    const pendingQueue = callQueue.filter((c) => c.status === "pending" && c.requestId !== requestId);

    // Use refs for the session so cleanup never goes stale and re-renders don't
    // cause double-init in React StrictMode.
    const sessionRef = useRef<DefaultMeetingSession | null>(null);
    const stoppedByUsRef = useRef(false); // true when WE initiated the stop
    const callStartTimeRef = useRef<number>(0);

    // Recording
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploadingRecording, setIsUploadingRecording] = useState(false);

    // Transcription
    const transcriptLinesRef = useRef<TranscriptLine[]>([]);
    const fullTranscriptRef = useRef<string>("");
    const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
    const [transcriptionActive, setTranscriptionActive] = useState(false);
    const [showCaptions, setShowCaptions] = useState(true);

    const [status, setStatus] = useState<"initialising" | "ready" | "error">("initialising");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [micOn, setMicOn] = useState(initialMicOn);
    const [cameraOn, setCameraOn] = useState(initialCameraOn);
    const [noiseCancellationOn, setNoiseCancellationOn] = useState(false);
    const vfTransformerRef = useRef<VoiceFocusDeviceTransformer | null>(null);
    const vfDeviceRef = useRef<ReturnType<VoiceFocusDeviceTransformer["createTransformDevice"]> extends Promise<infer T> ? T : never>(null);
    const rawAudioDeviceIdRef = useRef<string | null>(null);
    const [remoteTileId, setRemoteTileId] = useState<number | null>(null);
    const [remoteMuted, setRemoteMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    // ── In-call consent invite ───────────────────────────────────────────────
    // Patient: true when the doctor has sent a pending consent invite during the call.
    // Doctor: receives a notification when the patient accepts.
    const [consentPending, setConsentPending] = useState(false);
    const [acceptingConsent, setAcceptingConsent] = useState(false);

    // ── Device lists & selection ──────────────────────────────────────────────
    const [audioInputs, setAudioInputs] = useState<{ value: string; label: string }[]>([]);
    const [videoInputs, setVideoInputs] = useState<{ value: string; label: string }[]>([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
    const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [pipMinimized, setPipMinimized] = useState(false);
    const [pipHovered, setPipHovered] = useState(false);

    // ── Network stats ────────────────────────────────────────────────────────
    interface NetworkStats {
        rtt: number;
        uplinkKbps: number;
        downlinkKbps: number;
        packetLoss: number;
        quality: "excellent" | "good" | "fair" | "poor";
    }
    const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    // Audio levels — written by Chime volume callbacks, read by AudioWaveform RAF
    const localAudioLevelRef = useRef(0);
    const remoteAudioLevelRef = useRef(0);

    // ── Call duration timer ──────────────────────────────────────────────────
    // Compute elapsed from the persisted start timestamp so the timer survives
    // page reloads (same pattern as ActiveCallIsland).

    useEffect(() => {
        if (status !== "ready" || !callStartTimeRef.current) return;
        const calcElapsed = () =>
            Math.max(0, Math.floor((Date.now() - callStartTimeRef.current) / 1000));
        setCallDuration(calcElapsed());
        const id = setInterval(() => setCallDuration(calcElapsed()), 1000);
        return () => clearInterval(id);
    }, [status]);

    // ── In-call consent invite (RTDB listener) ──────────────────────────────
    // Listens to /in-call-consent/{requestId}.
    // Patient: shows a banner when status is "pending".
    // Doctor: shows a notification when status flips to "accepted".

    useEffect(() => {
        // Path is patient-scoped so RTDB rules allow the patient to read/write:
        // /in-call-consent/{patientId}/{requestId}
        // For doctor: patientId = remoteUser's UID → but doctor can't read it directly.
        // Doctor only receives the "accepted" signal when patient writes it back.
        // We skip the listener on doctor side — we listen instead on the doctor's
        // OWN notification node written by the patient.
        // Actually both sides listen to the SAME node; only the patient (who owns
        // the patientId path) passes localUserId, so the path resolves correctly.
        const consentPath = userKind === "patient"
            ? `in-call-consent/${localUserId}/${requestId}`
            : null;

        if (!consentPath) return;

        const consentRef = dbRef(getClientDatabase(), consentPath);
        const unsub = onValue(consentRef, (snap) => {
            if (!snap.exists()) {
                setConsentPending(false);
                return;
            }
            const data = snap.val() as { doctorId: string; status: string };
            setConsentPending(data.status === "pending");
        });
        return () => unsub();
    }, [requestId, userKind, localUserId]);

    // Doctor listens on a separate notification node the patient writes to:
    // /in-call-consent-ack/{doctorId}/{requestId}
    useEffect(() => {
        if (userKind !== "doctor") return;
        const ackRef = dbRef(getClientDatabase(), `in-call-consent-ack/${localUserId}/${requestId}`);
        const unsub = onValue(ackRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.val() as { status: string; patientName?: string };
            if (data.status === "accepted") {
                notifications.show({
                    title: "Access granted",
                    message: `${remoteUser.name} accepted your health records request.`,
                    color: "teal",
                    icon: <IconShieldCheck size={18} />,
                    autoClose: 6000,
                });
                // Clear so it only fires once
                void dbSet(ackRef, null);
            }
        });
        return () => unsub();
    }, [requestId, userKind, localUserId, remoteUser.name]);

    const handleAcceptConsent = async () => {
        if (!doctorId) return;
        setAcceptingConsent(true);
        try {
            const res = await fetch(`/api/doctor-patients/invites/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept" }),
            });
            if (!res.ok) throw new Error("Failed");
            const db = getClientDatabase();
            await Promise.all([
                // Clear the patient's pending node
                dbSet(dbRef(db, `in-call-consent/${localUserId}/${requestId}`), null),
                // Write an ack for the doctor to pick up
                dbSet(dbRef(db, `in-call-consent-ack/${doctorId}/${requestId}`), {
                    status: "accepted",
                }),
            ]);
            setConsentPending(false);
            notifications.show({
                title: "Access granted",
                message: `You've given ${remoteUser.name} access to your health records.`,
                color: "teal",
                icon: <IconShieldCheck size={18} />,
            });
        } catch {
            notifications.show({
                title: "Failed",
                message: "Could not accept the request. Please try again.",
                color: "red",
            });
        } finally {
            setAcceptingConsent(false);
        }
    };

    const handleDeclineConsent = async () => {
        if (!doctorId) return;
        try {
            await fetch(`/api/doctor-patients/invites/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "decline" }),
            });
        } catch { /* best-effort */ } finally {
            // Clear the pending node so the banner disappears
            void dbSet(
                dbRef(getClientDatabase(), `in-call-consent/${localUserId}/${requestId}`),
                null,
            );
            setConsentPending(false);
        }
    };

    // ── Recording helpers ───────────────────────────────────────────────────

    const startRecording = useCallback((stream: MediaStream) => {
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm";
        try {
            const recorder = new MediaRecorder(stream, { mimeType });
            recordingChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordingChunksRef.current.push(e.data);
            };
            recorder.start(2000); // collect chunks every 2 s
            recorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
            console.warn("Recording unavailable:", err);
        }
    }, []);

    const finaliseRecording = useCallback(async (durationSeconds: number) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return;
        await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            recorder.stop();
        });
        const chunks = recordingChunksRef.current;
        if (chunks.length === 0) return;
        setIsUploadingRecording(true);
        try {
            const blob = new Blob(chunks, { type: "video/webm" });
            const storage = getStorage(firebaseApp);
            const path = `call-recordings/${requestId}/${Date.now()}.webm`;
            const fileRef = storageRef(storage, path);
            await uploadBytes(fileRef, blob);
            const downloadUrl = await getDownloadURL(fileRef);
            await fetch(`/api/meet/${requestId}/recording`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recordingUrl: downloadUrl, durationSeconds }),
            });
            notifications.show({
                title: "Recording saved",
                message: "The call recording has been saved to your history.",
                color: "teal",
                icon: <IconRecordMail size={18} />,
            });
        } catch (uploadErr) {
            console.error("Failed to save recording:", uploadErr);
            notifications.show({
                title: "Recording failed",
                message: "Could not save the call recording.",
                color: "red",
            });
        } finally {
            setIsUploadingRecording(false);
            setIsRecording(false);
        }
    }, [requestId]);

    // ── Transcription helpers ───────────────────────────────────────────────

    const startTranscription = useCallback(async (sess: DefaultMeetingSession) => {
        const handler = (event: TranscriptEvent) => {
            if (!("results" in event)) return; // TranscriptionStatus — skip
            event.results.forEach((result) => {
                const text = result.alternatives[0]?.transcript ?? "";
                if (!text) return;
                const line: TranscriptLine = {
                    id: result.resultId,
                    text,
                    isFinal: !result.isPartial,
                };
                transcriptLinesRef.current = [
                    ...transcriptLinesRef.current
                        .filter((l) => l.id !== result.resultId)
                        .slice(-19),
                    line,
                ];
                setTranscriptLines([...transcriptLinesRef.current]);
                if (!result.isPartial) {
                    fullTranscriptRef.current +=
                        (fullTranscriptRef.current ? " " : "") + text;
                }
            });
        };
        sess.audioVideo.transcriptionController?.subscribeToTranscriptEvent(handler);
        try {
            const res = await fetch(`/api/meet/${requestId}/transcription`, {
                method: "POST",
            });
            if (res.ok) setTranscriptionActive(true);
        } catch {
            // Non-fatal — transcription just won't be active
        }
    }, [requestId]);

    const stopTranscription = useCallback(async () => {
        try {
            await fetch(`/api/meet/${requestId}/transcription`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: fullTranscriptRef.current }),
                // keepalive ensures the request completes even if the page
                // unmounts / navigates away before the response arrives.
                keepalive: true,
            });
        } catch { /* best-effort */ }
        setTranscriptionActive(false);
    }, [requestId]);

    // ── Initialise Chime session ────────────────────────────────────────────

    useEffect(() => {
        // Guard against React StrictMode double-invocation: if a session is
        // already running (from the first mount) skip re-init.
        if (sessionRef.current) return;

        // Reset so the second StrictMode mount doesn't inherit a stale "true"
        // from the first mount's cleanup stop.
        stoppedByUsRef.current = false;
        let cancelled = false;

        const init = async () => {
            try {
                // ChimeLogger filters "session will not be reconnected" — an
                // intentional-stop artefact, not a real error. WARN level so
                // all other Chime warnings/errors remain visible.
                const logger = new ChimeLogger("Chime", LogLevel.WARN);
                const deviceController = new DefaultDeviceController(logger, {
                    enableWebAudio: true,
                });

                const config = new MeetingSessionConfiguration(
                    {
                        MeetingId: joinInfo.meeting.MeetingId,
                        MediaRegion: joinInfo.meeting.MediaRegion,
                        MediaPlacement: joinInfo.meeting.MediaPlacement,
                        // Omit ExternalMeetingId when undefined — Chime's event
                        // reporter flattens all config attributes and throws
                        // "Unhandled type" for undefined values.
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

                // ── Adaptive bitrate: simulcast upload + adaptive downlink ──
                // simulcast sends multiple spatial layers; Chime picks the best
                // quality each remote subscriber can receive.
                config.enableSimulcastForUnifiedPlanChromiumBasedBrowsers = true;
                // VideoAdaptiveProbePolicy probes for the highest quality stream
                // each downlink subscriber can sustain and falls back smoothly.
                config.videoDownlinkBandwidthPolicy = new VideoAdaptiveProbePolicy(logger);

                // Pass a NoOpEventReporter so Chime never tries to flatten
                // nested meeting attributes (MediaPlacement, etc.) into a flat
                // key-value map — that's what causes the
                // "Unhandled type received while flattening attributes" error.
                const eventController = new DefaultEventController(
                    config,
                    logger,
                    new NoOpEventReporter(),
                );
                const sess = new DefaultMeetingSession(
                    config,
                    logger,
                    deviceController,
                    eventController,
                );

                const observer = {
                    videoTileDidUpdate: (tileState: VideoTileState) => {
                        if (tileState.tileId === null) return;
                        if (tileState.localTile && localVideoRef.current) {
                            sess.audioVideo.bindVideoElement(
                                tileState.tileId,
                                localVideoRef.current,
                            );
                        } else if (!tileState.localTile && remoteVideoRef.current) {
                            sess.audioVideo.bindVideoElement(
                                tileState.tileId,
                                remoteVideoRef.current,
                            );
                            setRemoteTileId(tileState.tileId);
                            // Auto-start recording once remote stream is bound
                            const stream = remoteVideoRef.current.srcObject;
                            if (stream instanceof MediaStream && recorderRef.current === null) {
                                startRecording(stream);
                            }
                        }
                    },
                    videoTileWasRemoved: (tileId: number) => {
                        setRemoteTileId((prev) => (prev === tileId ? null : prev));
                    },
                    audioVideoDidStop: (sessionStatus: MeetingSessionStatus) => {
                        // Guard against stale callbacks: in React StrictMode the
                        // first session is stopped during cleanup, then a second
                        // mount resets stoppedByUsRef. The first session's
                        // audioVideoDidStop fires asynchronously and would
                        // otherwise treat the reset ref as a "remote hangup" and
                        // navigate away. Comparing the captured `sess` with the
                        // current ref ensures we only act on the active session.
                        if (sessionRef.current !== sess) return;

                        const code = sessionStatus.statusCode();

                        // ── Duplicate device join — always handle, even if
                        // stoppedByUsRef is set (e.g. StrictMode cleanup). ────
                        if (code === MeetingSessionStatusCode.AudioJoinedFromAnotherDevice) {
                            stoppedByUsRef.current = true;
                            const currentSess = sessionRef.current;
                            if (currentSess) {
                                void stopSession(currentSess);
                                sessionRef.current = null;
                            }
                            onEnd?.();
                            notifications.show({
                                title: "Joined from another device",
                                message: "You joined this call on another device or tab.",
                                color: "yellow",
                            });
                            router.push(exitRoute);
                            return;
                        }

                        // Only navigate away if the stop was triggered by the
                        // remote side (doctor/patient hung up) — not by our own
                        // cleanup or explicit End button.
                        if (stoppedByUsRef.current) return;

                        // Mark as stopped by us so the unmount cleanup does not
                        // attempt a redundant stopSession call.
                        stoppedByUsRef.current = true;

                        // Release camera / mic hardware immediately — the Chime
                        // session has already stopped on the server side (e.g.
                        // MeetingEnded), so we just need to free local devices.
                        const currentSess = sessionRef.current;
                        if (currentSess) {
                            void stopSession(currentSess);
                            sessionRef.current = null;
                        }

                        const isMeetingEnded = code === MeetingSessionStatusCode.MeetingEnded;

                        notifications.show({
                            title: "Call ended",
                            message: isMeetingEnded
                                ? "The meeting has ended."
                                : "The other person left the call.",
                            color: "gray",
                        });
                        const duration = Math.round(
                            (Date.now() - callStartTimeRef.current) / 1000,
                        );
                        void finaliseRecording(duration);
                        sessionStorage.removeItem(`callStartedAt_${requestId}`);
                        void stopTranscription();

                        // Clean up overlay immediately so the room disappears.
                        onEnd?.();

                        // End the call on the server so RTDB call-state is
                        // cleared, THEN navigate. Without this the patient
                        // lands on /chat/connect while RTDB still shows
                        // "accepted" → auto-redirects back to the meet lobby.
                        endCall.mutate({ requestId }, {
                            onSettled: () => router.push(exitRoute),
                        });
                    },
                };

                sess.audioVideo.addObserver(observer);

                // Enumerate and start devices
                const [audioDevices, videoDevices] = await Promise.all([
                    sess.audioVideo.listAudioInputDevices(),
                    sess.audioVideo.listVideoInputDevices(),
                ]);

                // If we were cancelled during the async device enumeration, stop
                // before doing anything else. Mark as "us" so the observer
                // doesn't trigger a navigation away from the room.
                if (cancelled) {
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                // ── Noise cancellation via Amazon Voice Focus ──────────────
                // VoiceFocusDeviceTransformer wraps the mic with a WebAssembly
                // noise-suppression model. Falls back to raw microphone on
                // unsupported browsers (e.g. Safari with no WASM SIMD).
                let noiseCancellationActive = false;
                const preferredAudioId = (initialAudioDeviceId && audioDevices.some((d) => d.deviceId === initialAudioDeviceId))
                    ? initialAudioDeviceId
                    : audioDevices[0]?.deviceId ?? null;
                if (preferredAudioId) {
                    rawAudioDeviceIdRef.current = preferredAudioId;
                    try {
                        // isSupported() takes an AssetSpec (no variant field) — pass no spec
                        const isSupported = await VoiceFocusDeviceTransformer.isSupported(
                            undefined,
                            { logger },
                        );
                        if (isSupported) {
                            const transformer = await VoiceFocusDeviceTransformer.create(
                                { variant: "auto" },
                                { logger },
                            );
                            vfTransformerRef.current = transformer;
                            const vfDevice = await transformer.createTransformDevice(
                                preferredAudioId,
                            );
                            if (vfDevice) {
                                vfDeviceRef.current = vfDevice;
                                await sess.audioVideo.startAudioInput(vfDevice);
                                noiseCancellationActive = true;
                            } else {
                                await sess.audioVideo.startAudioInput(preferredAudioId);
                            }
                        } else {
                            await sess.audioVideo.startAudioInput(preferredAudioId);
                        }
                    } catch (vfErr) {
                        // Voice Focus failed — fall back to plain microphone
                        console.warn("[VoiceFocus] Init failed, falling back to raw mic:", vfErr);
                        await sess.audioVideo.startAudioInput(preferredAudioId);
                    }
                }

                // ── Adaptive video quality ─────────────────────────────────
                // Request 720p @ 15 fps — Chime SDK and simulcast layers will
                // adapt the resolution/bitrate down based on available bandwidth.
                const preferredVideoId = (initialVideoDeviceId && videoDevices.some((d) => d.deviceId === initialVideoDeviceId))
                    ? initialVideoDeviceId
                    : videoDevices[0]?.deviceId ?? null;
                if (initialCameraOn && preferredVideoId) {
                    sess.audioVideo.chooseVideoInputQuality(1280, 720, 15);
                    await sess.audioVideo.startVideoInput(preferredVideoId);
                }

                if (cancelled) {
                    stoppedByUsRef.current = true;
                    await stopSession(sess);
                    return;
                }

                sessionRef.current = sess;
                // Restore persisted start time so the timer survives page
                // reloads. Only write a new timestamp the first time.
                const storageKey = `callStartedAt_${requestId}`;
                const stored = sessionStorage.getItem(storageKey);
                if (stored) {
                    callStartTimeRef.current = Number(stored);
                } else {
                    callStartTimeRef.current = Date.now();
                    sessionStorage.setItem(storageKey, String(callStartTimeRef.current));
                }
                sess.audioVideo.start();

                // Honour pre-join lobby choices
                if (initialCameraOn) {
                    sess.audioVideo.startLocalVideoTile();
                }
                if (!initialMicOn) {
                    sess.audioVideo.realtimeMuteLocalAudio();
                }
                setNoiseCancellationOn(noiseCancellationActive);
                setStatus("ready");

                // ── Populate device lists for settings ─────────────────────────
                setAudioInputs(audioDevices.map((d) => ({ value: d.deviceId, label: d.label || "Microphone" })));
                setVideoInputs(videoDevices.map((d) => ({ value: d.deviceId, label: d.label || "Camera" })));
                setSelectedAudioInput(preferredAudioId ?? audioDevices[0]?.deviceId ?? null);
                setSelectedVideoInput(preferredVideoId ?? videoDevices[0]?.deviceId ?? null);

                // ── Audio levels (local + remote) ─────────────────────────────
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

                // Start real-time transcription after session is established
                void startTranscription(sess);
            } catch (err) {
                if (!cancelled) {
                    setErrorMessage((err as Error)?.message ?? "Failed to start video session.");
                    setStatus("error");
                }
            }
        };

        void init();

        // Safety timeout: if still "initialising" after 30s, surface an error
        // so the user can leave instead of staring at "Connecting…" forever.
        const timeout = setTimeout(() => {
            if (!cancelled && !sessionRef.current) {
                setErrorMessage("Connection timed out. Please try again.");
                setStatus("error");
            }
        }, 30_000);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            // Only stop if a session was fully initialised and stored.
            if (sessionRef.current) {
                stoppedByUsRef.current = true;
                void stopSession(sessionRef.current);
                sessionRef.current = null;
            }
        };
        // joinInfo is stable (object created once before this component mounts)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Mic toggle ──────────────────────────────────────────────────────────

    const toggleMic = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        if (micOn) {
            await sess.audioVideo.realtimeMuteLocalAudio();
        } else {
            await sess.audioVideo.realtimeUnmuteLocalAudio();
        }
        setMicOn((v) => !v);
    }, [micOn]);

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
                sess.audioVideo.chooseVideoInputQuality(1280, 720, 15);
                await sess.audioVideo.startVideoInput(videoDevices[0].deviceId);
            }
            sess.audioVideo.startLocalVideoTile();
        }
        setCameraOn((v) => !v);
    }, [cameraOn]);

    // ── Toggle noise cancellation ────────────────────────────────────────────

    const toggleNoiseCancellation = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        const rawId = rawAudioDeviceIdRef.current ?? selectedAudioInput;
        if (noiseCancellationOn) {
            // Turn OFF → optimistic UI then switch to raw mic
            setNoiseCancellationOn(false);
            if (rawId) {
                await sess.audioVideo.startAudioInput(rawId);
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
                    const isSupported = await VoiceFocusDeviceTransformer.isSupported(
                        undefined,
                        { logger: new ConsoleLogger("VF", LogLevel.OFF) },
                    );
                    if (!isSupported) {
                        setNoiseCancellationOn(false);
                        notifications.show({
                            title: "Not available",
                            message: "Noise cancellation is not supported on this browser",
                            color: "yellow",
                            icon: <IconAlertCircle size={18} />,
                        });
                        return;
                    }
                    transformer = await VoiceFocusDeviceTransformer.create(
                        { variant: "auto" },
                        { logger: new ConsoleLogger("VF", LogLevel.OFF) },
                    );
                    vfTransformerRef.current = transformer;
                }
                vfDevice = await transformer.createTransformDevice(rawId);
                if (vfDevice) {
                    vfDeviceRef.current = vfDevice;
                    await sess.audioVideo.startAudioInput(vfDevice);
                } else {
                    setNoiseCancellationOn(false);
                    notifications.show({
                        title: "Not available",
                        message: "Failed to enable noise cancellation",
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
    }, [noiseCancellationOn, selectedAudioInput]);

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
    }, [micOn, noiseCancellationOn]);

    // ── Switch video input device ────────────────────────────────────────────

    const switchVideoInput = useCallback(async (deviceId: string) => {
        const sess = sessionRef.current;
        if (!sess) return;
        try {
            sess.audioVideo.chooseVideoInputQuality(1280, 720, 15);
            await sess.audioVideo.startVideoInput(deviceId);
            setSelectedVideoInput(deviceId);
            if (!cameraOn) {
                sess.audioVideo.startLocalVideoTile();
                setCameraOn(true);
            }
        } catch {
            notifications.show({ title: "Error", message: "Failed to switch camera", color: "red", icon: <IconX size={18} /> });
        }
    }, [cameraOn]);

    // ── Network stats polling ────────────────────────────────────────────────

    useEffect(() => {
        if (status !== "ready" || !settingsOpen) return;
        let stopped = false;

        const pollStats = async () => {
            const sess = sessionRef.current;
            if (!sess || stopped) return;
            try {
                const stats = await sess.audioVideo.getRTCPeerConnectionStats();
                if (!stats) return;
                let rtt = 0;
                let bytesSentNow = 0;
                let bytesRecvNow = 0;
                let packetsLost = 0;
                let packetsTotal = 0;

                stats.forEach((report) => {
                    if (report.type === "candidate-pair" && report.nominated) {
                        rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
                    }
                    if (report.type === "outbound-rtp") {
                        bytesSentNow += report.bytesSent ?? 0;
                    }
                    if (report.type === "inbound-rtp") {
                        bytesRecvNow += report.bytesReceived ?? 0;
                        packetsLost += report.packetsLost ?? 0;
                        packetsTotal += (report.packetsReceived ?? 0) + (report.packetsLost ?? 0);
                    }
                });

                const loss = packetsTotal > 0 ? (packetsLost / packetsTotal) * 100 : 0;
                const quality: NetworkStats["quality"] = (() => {
                    if (rtt < 100 && loss < 1) return "excellent";
                    if (rtt < 200 && loss < 3) return "good";
                    if (rtt < 400 && loss < 8) return "fair";
                    return "poor";
                })();

                setNetworkStats({
                    rtt: Math.round(rtt),
                    uplinkKbps: Math.round((bytesSentNow * 8) / 1024 / Math.max(1, callDuration)),
                    downlinkKbps: Math.round((bytesRecvNow * 8) / 1024 / Math.max(1, callDuration)),
                    packetLoss: Math.round(loss * 10) / 10,
                    quality,
                });
            } catch { /* ignore stats errors */ }
        };

        void pollStats();
        const interval = setInterval(() => void pollStats(), 3000);
        return () => { stopped = true; clearInterval(interval); };
    }, [status, settingsOpen, callDuration]);

    // ── End call ────────────────────────────────────────────────────────────

    const handleEnd = useCallback(() => {
        stoppedByUsRef.current = true;
        const durationSeconds = Math.round(
            (Date.now() - callStartTimeRef.current) / 1000,
        );
        sessionStorage.removeItem(`callStartedAt_${requestId}`);
        const sess = sessionRef.current;
        if (sess) {
            void stopSession(sess);
            sessionRef.current = null;
        }
        void finaliseRecording(durationSeconds);
        void stopTranscription();

        // Clean up the persistent overlay state immediately so the room
        // disappears while the end-call API runs in the background.
        onEnd?.();

        // Navigate only AFTER the end-call API completes. This ensures
        // the server clears the RTDB call-state node before the patient
        // lands on /chat/connect — otherwise the stale "accepted" status
        // would auto-redirect them back to the meet lobby.
        endCall.mutate({ requestId }, {
            onSettled: () => router.push(exitRoute),
        });
    }, [endCall, exitRoute, finaliseRecording, onEnd, requestId, router, stopTranscription]);

    // ── Render ──────────────────────────────────────────────────────────────

    if (status === "error") {
        return (
            <Stack align="center" justify="center" h="100vh" p="xl">
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    radius="lg"
                    title="Could not start video"
                >
                    {errorMessage ?? "Unable to access camera or microphone."}
                </Alert>
            </Stack>
        );
    }

    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                background: "light-dark(#f5f5f7, #0f0f0f)",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* ── Header island ──────────────────────────────────── */}
            <Box
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px 16px 0",
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <Group
                    gap="sm"
                    style={{
                        background: "light-dark(rgba(255,255,255,0.85), rgba(30,30,30,0.85))",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                        borderRadius: 999,
                        padding: "6px 18px",
                        boxShadow: "0 8px 32px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.5)), 0 0 0 0.5px light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06)) inset",
                        pointerEvents: "auto",
                        minHeight: 36,
                    }}
                >
                    {/* Remote user */}
                    <Group gap={6}>
                        <Text size="xs" fw={600} style={{ lineHeight: 1 }}>
                            {remoteUser.name}
                        </Text>
                        {remoteMuted ? (
                            <IconMicrophoneOff size={12} color="var(--mantine-color-red-4)" />
                        ) : status === "ready" ? (
                            <AudioWaveform levelRef={remoteAudioLevelRef} barHeight={10} barWidth={2} gap={1.5} />
                        ) : null}
                    </Group>

                    {/* Separator */}
                    <Box style={{ width: 1, height: 14, background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))" }} />

                    {/* Recording indicator — Teams style */}
                    {isRecording && (
                        <Group gap={6}>
                            <Box
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: "var(--mantine-color-red-6)",
                                    boxShadow: "0 0 6px var(--mantine-color-red-6)",
                                    animation: "meet-rec-pulse 1.5s ease-in-out infinite",
                                }}
                            />
                            <Text size="xs" fw={600} c="red.4" style={{ letterSpacing: "0.04em" }}>
                                Recording
                            </Text>
                        </Group>
                    )}
                    {isUploadingRecording && (
                        <Group gap={6}>
                            <Loader size={10} color="orange" />
                            <Text size="xs" fw={500} c="orange.4">
                                Saving recording…
                            </Text>
                        </Group>
                    )}

                    {/* Separator when recording + timer both show */}
                    {(isRecording || isUploadingRecording) && status === "ready" && (
                        <Box style={{ width: 1, height: 14, background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))" }} />
                    )}

                    {/* Call timer */}
                    {status === "ready" && (
                        <Group gap={6}>
                            <IconClock size={13} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.4))" />
                            <Text
                                size="xs"
                                fw={500}
                                style={{
                                    color: "light-dark(rgba(0,0,0,0.6), rgba(255,255,255,0.7))",
                                    fontVariantNumeric: "tabular-nums",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                {formatDuration(callDuration)}
                            </Text>
                        </Group>
                    )}
                    {status === "initialising" && (
                        <Group gap={6}>
                            <Loader size={12} color="light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))" type="dots" />
                            <Text size="xs" c="dimmed">
                                Setting up…
                            </Text>
                        </Group>
                    )}
                </Group>
            </Box>

            {/* ── Patients waiting queue (doctor only) ────────────────── */}
            {userKind === "doctor" && pendingQueue.length > 0 && (
                <Box
                    style={{
                        position: "absolute",
                        top: 64,
                        right: 16,
                        zIndex: 10,
                        pointerEvents: "auto",
                        maxWidth: 220,
                    }}
                >
                    <Paper
                        radius="lg"
                        p="sm"
                        style={{
                            background: "light-dark(rgba(255,255,255,0.88), rgba(30,30,30,0.88))",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                            boxShadow: "0 8px 24px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.4))",
                        }}
                    >
                        <Group gap={6} mb={8}>
                            <IconUsers size={14} color="var(--mantine-color-orange-5)" />
                            <Text size="xs" fw={600}>
                                {pendingQueue.length} {pendingQueue.length === 1 ? "patient" : "patients"} waiting
                            </Text>
                        </Group>
                        <Stack gap={6}>
                            {pendingQueue.slice(0, 5).map((entry, idx) => (
                                <Group key={entry.requestId} gap={8} wrap="nowrap">
                                    <Avatar
                                        size={24}
                                        radius="xl"
                                        src={entry.patientPhotoUrl ?? undefined}
                                        color="primary"
                                        style={{ fontSize: 10, flexShrink: 0 }}
                                    >
                                        {getInitials(entry.patientName)}
                                    </Avatar>
                                    <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
                                        {entry.patientName}
                                    </Text>
                                    <Badge size="xs" variant="light" color="orange" style={{ flexShrink: 0 }}>
                                        #{idx + 1}
                                    </Badge>
                                </Group>
                            ))}
                            {pendingQueue.length > 5 && (
                                <Text size="xs" c="dimmed" ta="center">
                                    +{pendingQueue.length - 5} more
                                </Text>
                            )}
                        </Stack>
                    </Paper>
                </Box>
            )}

            {/* ── Video area (full) ──────────────────────────────────── */}
            <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {/* Remote video (full canvas) */}
                <Box
                    style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                        background: remoteTileId === null
                            ? "radial-gradient(ellipse at 50% 40%, light-dark(#e8e8f0, #1a1a2e) 0%, light-dark(#f0f0f4, #0f0f0f) 70%)"
                            : "light-dark(#e8e8ee, #111)",
                    }}
                >
                    {/* Camera-off / waiting state */}
                    {remoteTileId === null && (
                        <Stack
                            align="center"
                            justify="center"
                            h="100%"
                            gap="lg"
                        >
                            {status === "initialising" ? (
                                <Stack align="center" gap="md">
                                    <Loader color="primary" size="lg" />
                                    <Text c="dimmed" size="sm">
                                        Connecting…
                                    </Text>
                                </Stack>
                            ) : (
                                <>
                                    {/* Glowing avatar */}
                                    <Box
                                        style={{
                                            position: "relative",
                                        }}
                                    >
                                        {/* Soft glow ring */}
                                        <Box
                                            style={{
                                                position: "absolute",
                                                inset: -8,
                                                borderRadius: "50%",
                                                background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                                            }}
                                        />
                                        <Avatar
                                            size={120}
                                            radius={999}
                                            color="primary"
                                            src={remoteUser.photoUrl ?? undefined}
                                            style={{
                                                border: "3px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                                                boxShadow: "0 0 40px rgba(99,102,241,0.25)",
                                            }}
                                        >
                                            <Text size="xl" fw={700}>
                                                {getInitials(remoteUser.name)}
                                            </Text>
                                        </Avatar>
                                        {/* Muted badge on avatar */}
                                        {remoteMuted && (
                                            <Box
                                                style={{
                                                    position: "absolute",
                                                    bottom: 4,
                                                    right: 4,
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: "50%",
                                                    background: "rgba(239,68,68,0.9)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    border: "2px solid light-dark(var(--mantine-color-body), #0f0f0f)",
                                                }}
                                            >
                                                <IconMicrophoneOff size={14} color="#fff" />
                                            </Box>
                                        )}
                                    </Box>
                                    <Stack align="center" gap={6}>
                                        <Text fw={600} size="lg">
                                            {remoteUser.name}
                                        </Text>
                                        <Text c="dimmed" size="sm">
                                            Camera is off
                                        </Text>
                                    </Stack>
                                </>
                            )}
                        </Stack>
                    )}

                    {/* Active remote video */}
                    <video
                        ref={remoteVideoRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: remoteTileId === null ? "none" : "block",
                        }}
                        autoPlay
                        playsInline
                    />


                </Box>

                {/* Local video PIP — bottom-right */}
                <Box
                    pos="absolute"
                    onMouseEnter={() => setPipHovered(true)}
                    onMouseLeave={() => setPipHovered(false)}
                    style={{
                        bottom: 90,
                        right: 16,
                        zIndex: 10,
                        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                    }}
                >
                    {/* Minimize / restore toggle */}
                    <Tooltip label={pipMinimized ? "Show self view" : "Hide self view"} position="left">
                        <ActionIcon
                            size={22}
                            radius={999}
                            variant="filled"
                            color="dark"
                            onClick={() => setPipMinimized((v) => !v)}
                            style={{
                                position: "absolute",
                                top: pipMinimized ? -4 : 4,
                                right: pipMinimized ? -4 : 4,
                                zIndex: 12,
                                border: "1.5px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                                opacity: pipMinimized || pipHovered ? 0.85 : 0,
                                transition: "opacity 0.15s ease",
                                pointerEvents: pipMinimized || pipHovered ? "auto" : "none",
                            }}
                        >
                            {pipMinimized ? <IconVideo size={12} /> : <IconX size={12} />}
                        </ActionIcon>
                    </Tooltip>

                    {/* Minimised pill — small indicator (shown when minimized) */}
                    {pipMinimized && (
                        <Paper
                            radius={999}
                            onClick={() => setPipMinimized(false)}
                            style={{
                                width: 40,
                                height: 40,
                                overflow: "hidden",
                                border: "2px solid var(--mantine-color-primary-7)",
                                background: "radial-gradient(circle, light-dark(#e8e8f0, #1a1a2e), light-dark(#f0f0f4, #0f0f0f))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            <IconVideo size={18} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" />
                        </Paper>
                    )}

                    {/* Full PIP — always mounted to preserve Chime tile binding, hidden when minimized */}
                    <Box style={pipMinimized ? { position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" } : undefined}>
                        <Paper
                            radius="md"
                            style={{
                                width: 200,
                                aspectRatio: "16/9",
                                overflow: "hidden",
                                border: "2px solid var(--mantine-color-primary-7)",
                                background: cameraOn ? "light-dark(#e8e8ee, #1a1a1a)" : "radial-gradient(circle, light-dark(#e8e8f0, #1a1a2e), light-dark(#f0f0f4, #0f0f0f))",
                                position: "relative",
                            }}
                        >
                            {/* Always mount the <video> so localVideoRef stays
                                available for Chime's videoTileDidUpdate binding.
                                Hiding via display:none keeps the ref intact when
                                the camera is toggled off then back on. */}
                            <video
                                ref={localVideoRef}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: cameraOn ? "block" : "none",
                                }}
                                autoPlay
                                playsInline
                                muted
                            />
                            {!cameraOn && (
                                <Box
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Avatar
                                        size={52}
                                        radius={999}
                                        color="primary"
                                        src={localUser.photoUrl ?? undefined}
                                        style={{ border: "2px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.1))" }}
                                    >
                                        {getInitials(localUser.name)}
                                    </Avatar>
                                </Box>
                            )}

                            {/* Local name overlay — inside PIP, bottom-left */}
                            {cameraOn && (
                                <Box
                                    pos="absolute"
                                    style={{
                                        bottom: 5,
                                        left: 6,
                                        background: "rgba(0,0,0,0.55)",
                                        backdropFilter: "blur(4px)",
                                        borderRadius: 10,
                                        padding: "2px 7px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <Text size="10px" fw={500} c="white" style={{ lineHeight: 1.4 }}>
                                        {localUser.name}
                                    </Text>
                                    {micOn ? (
                                        <AudioWaveform levelRef={localAudioLevelRef} barHeight={8} barWidth={2} gap={1.5} />
                                    ) : (
                                        <IconMicrophoneOff size={9} color="var(--mantine-color-red-4)" />
                                    )}
                                </Box>
                            )}
                        </Paper>

                        {/* Name below PIP when camera is off */}
                        {!cameraOn && (
                            <Text
                                size="xs"
                                c="dimmed"
                                ta="center"
                                fw={500}
                                style={{ marginTop: 6, lineHeight: 1 }}
                            >
                                {localUser.name}
                            </Text>
                        )}
                    </Box>
                </Box>

                {/* In-call consent banner — top centre, patient-side only */}
                {consentPending && userKind === "patient" && (
                    <Box
                        pos="absolute"
                        style={{
                            top: 16,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                            width: "min(400px, 88%)",
                        }}
                    >
                        <Paper
                            style={{
                                background: "light-dark(rgba(255, 255, 255, 0.92), rgba(10, 10, 25, 0.92))",
                                backdropFilter: "blur(20px)",
                                border: "1px solid rgba(99, 102, 241, 0.4)",
                                borderRadius: 16,
                                padding: "14px 18px",
                            }}
                        >
                            <Group gap="xs" mb={6}>
                                <IconShieldCheck size={18} color="var(--mantine-color-indigo-4)" />
                                <Text fw={600} size="sm">
                                    Health Records Request
                                </Text>
                            </Group>
                            <Text c="dimmed" size="xs" mb="md" style={{ lineHeight: 1.5 }}>
                                {remoteUser.name} is requesting access to your health records
                                for this consultation.
                            </Text>
                            <Group gap="xs">
                                <Button
                                    size="xs"
                                    color="teal"
                                    leftSection={<IconCheck size={13} />}
                                    loading={acceptingConsent}
                                    onClick={() => void handleAcceptConsent()}
                                >
                                    Accept
                                </Button>
                                <Button
                                    size="xs"
                                    color="red"
                                    variant="subtle"
                                    leftSection={<IconX size={13} />}
                                    disabled={acceptingConsent}
                                    onClick={() => void handleDeclineConsent()}
                                >
                                    Decline
                                </Button>
                            </Group>
                        </Paper>
                    </Box>
                )}

                {/* Live captions overlay — bottom centre */}
                {showCaptions && transcriptLines.length > 0 && (
                    <Box
                        pos="absolute"
                        style={{
                            bottom: 16,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "min(640px, 60%)",
                            background: "rgba(0,0,0,0.72)",
                            backdropFilter: "blur(8px)",
                            borderRadius: "var(--mantine-radius-md)",
                            padding: "10px 16px",
                            border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                        }}
                    >
                        <ScrollArea h={72} offsetScrollbars={false}>
                            <Stack gap={2}>
                                {transcriptLines.slice(-4).map((line) => (
                                    <Text
                                        key={line.id}
                                        size="sm"
                                        c={line.isFinal ? "white" : "dimmed"}
                                        style={{ lineHeight: 1.4 }}
                                    >
                                        {line.text}
                                    </Text>
                                ))}
                            </Stack>
                        </ScrollArea>
                    </Box>
                )}
            </Box>

            {/* ── Controls bar (iOS island) ─────────────────────────── */}
            <Box
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                    padding: "12px 16px 24px",
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <Group
                    justify="center"
                    gap={8}
                    style={{
                        background: "light-dark(rgba(255,255,255,0.85), rgba(30,30,30,0.85))",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                        borderRadius: 999,
                        padding: "6px 10px",
                        boxShadow: "0 8px 32px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.5)), 0 0 0 0.5px light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06)) inset",
                        pointerEvents: "auto",
                    }}
                >
                    {/* Mic */}
                    <Tooltip label={micOn ? "Mute" : "Unmute"} position="top">
                        <ActionIcon
                            size={40}
                            radius={999}
                            variant="subtle"
                            color="gray"
                            onClick={() => void toggleMic()}
                            style={{
                                background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                color: micOn
                                    ? "light-dark(var(--mantine-color-text), #fff)"
                                    : "var(--mantine-color-red-6)",
                                transition: "background 0.15s ease, color 0.15s ease",
                            }}
                        >
                            {micOn ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    {/* Camera */}
                    <Tooltip label={cameraOn ? "Turn off camera" : "Turn on camera"} position="top">
                        <ActionIcon
                            size={40}
                            radius={999}
                            variant="subtle"
                            color="gray"
                            onClick={() => void toggleCamera()}
                            style={{
                                background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                color: cameraOn
                                    ? "light-dark(var(--mantine-color-text), #fff)"
                                    : "var(--mantine-color-red-6)",
                                transition: "background 0.15s ease, color 0.15s ease",
                            }}
                        >
                            {cameraOn ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
                        </ActionIcon>
                    </Tooltip>

                    {/* Settings button */}
                    <Tooltip label="Settings" position="top">
                        <ActionIcon
                            size={40}
                            radius={999}
                            variant={settingsOpen ? "light" : "subtle"}
                            color={settingsOpen ? "primary" : "gray"}
                            onClick={() => setSettingsOpen((v) => !v)}
                            style={{
                                background: settingsOpen ? undefined : "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                color: "light-dark(var(--mantine-color-text), #fff)",
                                transition: "background 0.15s ease",
                            }}
                        >
                            <IconSettings size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* Settings modal */}
                    <Modal
                        opened={settingsOpen}
                        onClose={() => setSettingsOpen(false)}
                        title="Settings"
                        radius="lg"
                        size="sm"
                        centered
                        zIndex={10000}
                        overlayProps={{ backgroundOpacity: 0.35, blur: 4 }}
                        styles={{
                            header: {
                                background: "light-dark(#fff, #1a1a1e)",
                                borderBottom: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                            },
                            title: { fontWeight: 700, fontSize: 14 },
                            body: { padding: 0, background: "light-dark(#fff, #1a1a1e)" },
                            content: { background: "light-dark(#fff, #1a1a1e)" },
                        }}
                    >
                        {/* ── Devices ── */}
                        <Box style={{ padding: "12px 16px" }}>
                            <Text size="10px" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                                Devices
                            </Text>

                            <Stack gap="xs">
                                <Box>
                                    <Group gap={6} mb={4}>
                                        <IconMicrophone size={13} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" />
                                        <Text size="xs" c="dimmed">Microphone</Text>
                                    </Group>
                                    <Select
                                        size="xs"
                                        data={audioInputs}
                                        value={selectedAudioInput}
                                        onChange={(val) => { if (val) void switchAudioInput(val); }}
                                        allowDeselect={false}
                                        styles={{
                                            input: {
                                                background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                                fontSize: 12,
                                            },
                                            dropdown: {
                                                background: "light-dark(rgba(255,255,255,0.98), rgba(30,30,34,0.98))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                            },
                                            option: { fontSize: 12 },
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <Group gap={6} mb={4}>
                                        <IconVideo size={13} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" />
                                        <Text size="xs" c="dimmed">Camera</Text>
                                    </Group>
                                    <Select
                                        size="xs"
                                        data={videoInputs}
                                        value={selectedVideoInput}
                                        onChange={(val) => { if (val) void switchVideoInput(val); }}
                                        allowDeselect={false}
                                        styles={{
                                            input: {
                                                background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                                fontSize: 12,
                                            },
                                            dropdown: {
                                                background: "light-dark(rgba(255,255,255,0.98), rgba(30,30,34,0.98))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                            },
                                            option: { fontSize: 12 },
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </Box>

                        <Divider color="light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))" />

                        {/* ── Features ── */}
                        <Box style={{ padding: "12px 16px" }}>
                            <Text size="10px" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                                Features
                            </Text>
                            <Stack gap={8}>
                                <Group justify="space-between">
                                    <Group gap={8}>
                                        <IconWaveSine size={14} color={noiseCancellationOn ? "var(--mantine-color-teal-4)" : "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))"} />
                                        <Text size="xs">Noise cancellation</Text>
                                    </Group>
                                    <Switch
                                        size="xs"
                                        checked={noiseCancellationOn}
                                        onChange={() => void toggleNoiseCancellation()}
                                        styles={{ track: { cursor: "pointer" } }}
                                    />
                                </Group>
                                <Group justify="space-between">
                                    <Group gap={8}>
                                        <IconWaveSine size={14} color={showCaptions ? "var(--mantine-color-violet-4)" : "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))"} />
                                        <Text size="xs">Live captions</Text>
                                    </Group>
                                    <Switch
                                        size="xs"
                                        checked={showCaptions}
                                        onChange={() => setShowCaptions((v) => !v)}
                                        styles={{ track: { cursor: "pointer" } }}
                                    />
                                </Group>
                            </Stack>
                        </Box>

                        <Divider color="light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))" />

                        {/* ── Network ── */}
                        <Box style={{ padding: "12px 16px 14px" }}>
                            <Text size="10px" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                                Network
                            </Text>
                            {networkStats ? (() => {
                                const qualityColor = {
                                    excellent: "teal",
                                    good: "green",
                                    fair: "yellow",
                                    poor: "red",
                                }[networkStats.quality];
                                const qualityPercent = {
                                    excellent: 100,
                                    good: 75,
                                    fair: 45,
                                    poor: 15,
                                }[networkStats.quality];
                                return (
                                    <Stack gap={10}>
                                        {/* Quality bar */}
                                        <Box>
                                            <Group justify="space-between" mb={4}>
                                                <Group gap={6}>
                                                    <IconWifi size={13} color={`var(--mantine-color-${qualityColor}-4)`} />
                                                    <Text size="xs" fw={500}>Connection</Text>
                                                </Group>
                                                <Text size="xs" fw={600} c={`${qualityColor}.4`} style={{ textTransform: "capitalize" }}>
                                                    {networkStats.quality}
                                                </Text>
                                            </Group>
                                            <Progress
                                                value={qualityPercent}
                                                color={qualityColor}
                                                size={4}
                                                radius="xl"
                                                style={{ background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))" }}
                                            />
                                        </Box>

                                        {/* Stat grid */}
                                        <Group grow gap="xs">
                                            <Paper
                                                radius="md"
                                                style={{
                                                    background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                    border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                    padding: "8px 10px",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <Text size="10px" c="dimmed" style={{ lineHeight: 1, marginBottom: 4 }}>Latency</Text>
                                                <Text size="xs" fw={700} style={{ lineHeight: 1 }}>{networkStats.rtt} ms</Text>
                                            </Paper>
                                            <Paper
                                                radius="md"
                                                style={{
                                                    background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                    border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                    padding: "8px 10px",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <Text size="10px" c="dimmed" style={{ lineHeight: 1, marginBottom: 4 }}>Loss</Text>
                                                <Text size="xs" fw={700} style={{ lineHeight: 1 }}>{networkStats.packetLoss}%</Text>
                                            </Paper>
                                        </Group>

                                        <Group grow gap="xs">
                                            <Paper
                                                radius="md"
                                                style={{
                                                    background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                    border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                    padding: "8px 10px",
                                                }}
                                            >
                                                <Group gap={4} justify="center">
                                                    <IconArrowUp size={11} color="var(--mantine-color-teal-4)" />
                                                    <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>Upload</Text>
                                                </Group>
                                                <Text size="xs" fw={700} ta="center" style={{ lineHeight: 1, marginTop: 4 }}>
                                                    {networkStats.uplinkKbps > 1024
                                                        ? `${(networkStats.uplinkKbps / 1024).toFixed(1)} Mbps`
                                                        : `${networkStats.uplinkKbps} Kbps`
                                                    }
                                                </Text>
                                            </Paper>
                                            <Paper
                                                radius="md"
                                                style={{
                                                    background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                    border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                    padding: "8px 10px",
                                                }}
                                            >
                                                <Group gap={4} justify="center">
                                                    <IconArrowDown size={11} color="var(--mantine-color-violet-4)" />
                                                    <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>Download</Text>
                                                </Group>
                                                <Text size="xs" fw={700} ta="center" style={{ lineHeight: 1, marginTop: 4 }}>
                                                    {networkStats.downlinkKbps > 1024
                                                        ? `${(networkStats.downlinkKbps / 1024).toFixed(1)} Mbps`
                                                        : `${networkStats.downlinkKbps} Kbps`
                                                    }
                                                </Text>
                                            </Paper>
                                        </Group>
                                    </Stack>
                                );
                            })() : (
                                <Group gap={6} justify="center" py={8}>
                                    <Loader size={12} color="dimmed" />
                                    <Text size="xs" c="dimmed">Measuring…</Text>
                                </Group>
                            )}
                        </Box>
                    </Modal>

                    {/* Separator + Home (doctor only) + End call */}
                    <Box style={{ width: 1, height: 20, background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))" }} />

                    {userKind === "doctor" && (
                        <Tooltip label="Go to Dashboard" position="top">
                            <ActionIcon
                                size={40}
                                radius={999}
                                variant="light"
                                color="gray"
                                onClick={() => {
                                    onMinimize?.();
                                    router.push("/doctor/dashboard");
                                }}
                                style={{
                                    background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                    color: "light-dark(rgba(0,0,0,0.7), rgba(255,255,255,0.85))",
                                }}
                            >
                                <IconHome size={20} />
                            </ActionIcon>
                        </Tooltip>
                    )}

                    <Tooltip label="End call" position="top">
                        <ActionIcon
                            size={40}
                            radius={999}
                            color="red"
                            variant="filled"
                            onClick={handleEnd}
                            style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
                        >
                            <IconPhone
                                size={20}
                                style={{ transform: "rotate(135deg)" }}
                            />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Box>
        </Box>
    );
}
