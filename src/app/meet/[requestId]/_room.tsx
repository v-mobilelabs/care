"use client";
/**
 * _room.tsx — Chime SDK video meeting room.
 *
 * Features:
 *  - Adaptive bitrate (simulcast + VideoAdaptiveProbePolicy)
 *  - Voice Focus noise cancellation with graceful fallback
 *  - Session recording saved to Firebase Storage + call history
 *  - Proper media track release on disconnect (fixes camera light staying on)
 *
 * Dynamically imported (no SSR) to avoid `window` / Web Audio errors in Node.
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
import { Alert, Box, Button, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconHome, IconRecordMail, IconScreenShare, IconShieldCheck, IconWifi, IconWifiOff, IconX } from "@tabler/icons-react";
import { ref as dbRef, onValue, set as dbSet, update as dbUpdate } from "firebase/database";
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AttendeeJoinInfo } from "@/data/meet";
import { firebaseApp, getClientDatabase } from "@/lib/firebase/client";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";
import { useMessages } from "@/lib/messaging/use-messages";
import { useTyping } from "@/lib/messaging/use-typing";
import { sendMessage as sendDmMessage, markAsRead } from "@/lib/messaging/actions";
import { useInbox } from "@/lib/messaging/use-inbox";
import { ChatSidebar } from "./_chat-sidebar";
import { ConsentBanner } from "./_consent-banner";
import { ControlBar } from "./_control-bar";
import { FeedbackModal } from "./_feedback-modal";
import { LocalPip } from "./_local-pip";
import { QueueOverlay } from "./_queue-overlay";
import { RemoteVideo } from "./_remote-video";
import { RoomHeader } from "./_room-header";
import type { ConnectionHealth, NetworkStats, Participant } from "./_room-types";

// ── Types ─────────────────────────────────────────────────────────────────────

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
    /** DM conversation ID for in-call chat. */
    conversationId: string | null;
    /** The patient's UID — used to derive the recipientId for sending messages. */
    patientId: string | null;
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

/** Race a promise against a timeout — returns `null` when the deadline expires. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return Promise.race([
        promise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
}

// ── Main room component ───────────────────────────────────────────────────────

export function MeetingRoom({ requestId, joinInfo, localUser, remoteUser, exitRoute, userKind, localUserId, doctorId, conversationId, patientId, initialMicOn = true, initialCameraOn = true, initialAudioDeviceId, initialVideoDeviceId, onEnd, onMinimize }: Readonly<RoomProps>) {
    const router = useRouter();

    // Doctor's pending call queue — shows patients waiting while the doctor is on a call
    const callQueue = useDoctorCallQueue(userKind === "doctor" ? localUserId : undefined);
    const pendingQueue = callQueue.filter((c) => c.status === "pending" && c.requestId !== requestId);

    // Use refs for the session so cleanup never goes stale and re-renders don't
    // cause double-init in React StrictMode.
    const sessionRef = useRef<DefaultMeetingSession | null>(null);
    const stoppedByUsRef = useRef(false); // true when WE initiated the stop
    const callStartTimeRef = useRef<number>(0);
    // Single idempotent flag to prevent multiple teardown executions from
    // the 3 parallel end-call signal paths (handleEnd, RTDB, Chime observer).
    const teardownCalledRef = useRef(false);

    // ── Reconnection state ────────────────────────────────────────────────
    const MAX_RECONNECT_ATTEMPTS = 5;
    const reconnectAttemptsRef = useRef(0);
    // True while we are auto-reconnecting (not user-initiated retry)
    const isReconnectingRef = useRef(false);

    // Recording
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploadingRecording, setIsUploadingRecording] = useState(false);

    const [status, setStatus] = useState<"initialising" | "ready" | "error">("initialising");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [micOn, setMicOn] = useState(initialMicOn);
    const [cameraOn, setCameraOn] = useState(initialCameraOn);
    const [noiseCancellationOn, setNoiseCancellationOn] = useState(false);
    const vfTransformerRef = useRef<VoiceFocusDeviceTransformer | null>(null);
    const vfDeviceRef = useRef<ReturnType<VoiceFocusDeviceTransformer["createTransformDevice"]> extends Promise<infer T> ? T : never>(null);
    const rawAudioDeviceIdRef = useRef<string | null>(null);

    // ── Background blur state ────────────────────────────────────────────────
    const [backgroundBlurOn, setBackgroundBlurOn] = useState(true); // enabled by default
    const blurProcessorRef = useRef<BackgroundBlurProcessor | null>(null);
    const blurTransformDeviceRef = useRef<DefaultVideoTransformDevice | null>(null);

    const localTileIdRef = useRef<number | null>(null);
    const [remoteTileId, setRemoteTileId] = useState<number | null>(null);
    const [remoteMuted, setRemoteMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    // ── Screen sharing state ─────────────────────────────────────────────────
    const [screenShareOn, setScreenShareOn] = useState(false);
    const screenShareOnRef = useRef(false);
    const [remoteScreenShareTileId, setRemoteScreenShareTileId] = useState<number | null>(null);
    const contentShareVideoRef = useRef<HTMLVideoElement | null>(null);

    // ── Post-call feedback ───────────────────────────────────────────────────
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const feedbackExitRouteRef = useRef<string>("");
    const feedbackReasonRef = useRef<string>("");

    // ── Connection health state ───────────────────────────────────────────────
    const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>("good");
    const connectionHealthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // ── In-call chat (RTDB DM) ──────────────────────────────────────────
    const [chatOpen, setChatOpen] = useState(false);
    const [chatDraft, setChatDraft] = useState("");

    // Derive unread count from the persisted RTDB inbox entry so it
    // survives page reloads and stays in sync with the messaging drawer.
    const { entries: inboxEntries } = useInbox(localUserId);
    const inboxEntry = conversationId
        ? inboxEntries.find((e) => e.conversationId === conversationId)
        : undefined;
    const unreadCount = inboxEntry?.unread ?? 0;

    // When the chat panel is opened, persist the read status to RTDB.
    useEffect(() => {
        if (chatOpen && conversationId && localUserId) {
            void markAsRead(localUserId, conversationId);
        }
    }, [chatOpen, conversationId, localUserId]);

    // DM hooks — subscribe to real-time messages and typing indicators.
    // Pass localUserId so markAsRead fires automatically when the chat
    // panel is open and new messages arrive.
    const recipientId = userKind === "doctor" ? patientId : doctorId;
    const { messages: chatMessages } = useMessages(
        conversationId,
        200,
        chatOpen ? localUserId : null,
    );
    const { otherTyping, startTyping, clearTyping } = useTyping(conversationId, localUserId, recipientId);

    // ── Network stats ────────────────────────────────────────────────────────
    const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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

    // ── Consolidated teardown ────────────────────────────────────────────────
    // Idempotent: safe to call from handleEnd, RTDB listener, OR Chime observer.
    // Only the first invocation runs; subsequent calls are no-ops.
    type TeardownReason = "user" | "remote-rtdb" | "chime-ended" | "chime-kicked";

    const teardown = useCallback((reason: TeardownReason) => {
        if (teardownCalledRef.current) return;
        teardownCalledRef.current = true;
        stoppedByUsRef.current = true;

        const durationSeconds = Math.round(
            (Date.now() - callStartTimeRef.current) / 1000,
        );

        // Clear persisted session state
        sessionStorage.removeItem(`callStartedAt_${requestId}`);
        sessionStorage.removeItem(`callMicOn_${requestId}`);
        sessionStorage.removeItem(`callCamOn_${requestId}`);

        // Release Chime media resources
        const sess = sessionRef.current;
        if (sess) {
            sessionRef.current = null;
            void stopSession(sess);
        }

        // Notification
        const message = (() => {
            if (reason === "chime-kicked") return "You joined this call on another device or tab.";
            if (reason === "user") return "You ended the call.";
            return "The other person ended the call.";
        })();
        notifications.show({
            title: reason === "chime-kicked" ? "Joined from another device" : "Call ended",
            message,
            color: reason === "chime-kicked" ? "yellow" : "gray",
        });

        // Clean up overlay
        onEnd?.();

        // Show feedback modal for normal call ends (not kicked scenarios).
        // For kicks, navigate immediately since it's not the user's choice.
        if (reason === "chime-kicked") {
            router.push(exitRoute);
        } else {
            feedbackExitRouteRef.current = exitRoute;
            feedbackReasonRef.current = reason;
            setFeedbackOpen(true);
        }

        // Fire-and-forget async cleanup ──────────────────────────────────
        // ① RTDB signal for the other participant (only when WE ended)
        if (reason === "user") {
            void dbSet(
                dbRef(getClientDatabase(), `call-ended/${requestId}/${localUserId}`),
                true,
            ).catch((err: unknown) => console.error("[call-end] RTDB write FAILED", err));
        }

        // ② Server-side cleanup (only when user-initiated or Chime observer;
        //    when remote-rtdb fires, the other party already called the API)
        if (reason === "user" || reason === "chime-ended") {
            void fetch(`/api/meet/${requestId}/end`, {
                method: "POST",
                keepalive: true,
            }).catch((err: unknown) => console.error("[call-end] API call FAILED", err));
        }

        // ③ Save recording
        void finaliseRecording(durationSeconds);

        // ④ Optimistic patient call-state update
        if (userKind === "patient") {
            void dbUpdate(
                dbRef(getClientDatabase(), `call-state/${localUserId}`),
                { status: "ended" },
            );
        }
    }, [exitRoute, finaliseRecording, localUserId, onEnd, requestId, router, userKind]);

    // ── RTDB listener for remote call-end ─────────────────────────────────
    // When either participant clicks End, their client writes
    // /call-ended/{requestId}/{theirUid} = true BEFORE calling the server
    // API. This listener detects that write and tears down the local
    // session — it works even if Chime's MeetingEnded signal is slow
    // or the server API hasn't completed yet.
    useEffect(() => {
        const endedRef = dbRef(
            getClientDatabase(),
            `call-ended/${requestId}`,
        );

        const unsub = onValue(endedRef, (snap) => {
            if (!snap.exists()) return;

            // Check if the OTHER participant wrote a child here.
            const data = snap.val() as Record<string, boolean>;
            const otherEnded = Object.keys(data).some(
                (uid) => uid !== localUserId && data[uid] === true,
            );
            if (!otherEnded) return;

            // Idempotent — teardown no-ops if already called.
            teardown("remote-rtdb");
        });

        return () => unsub();
    }, [localUserId, requestId, teardown]);

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
                // Allow the SDK more time to recover the WebSocket before
                // giving up so short network blips don't end the call.
                config.reconnectTimeoutMs = 30_000;

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
                    connectionDidBecomePoor: () => {
                        setConnectionHealth("poor");
                        // Auto-clear after 10s if quality improves (no further callback)
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

                        // Content share tiles (screen sharing)
                        if (tileState.isContent) {
                            if (!tileState.localTile && contentShareVideoRef.current) {
                                sess.audioVideo.bindVideoElement(
                                    tileState.tileId,
                                    contentShareVideoRef.current,
                                );
                                setRemoteScreenShareTileId(tileState.tileId);
                                // Explicitly kick playback — autoPlay is unreliable
                                // when the element was invisible or just had srcObject swapped.
                                contentShareVideoRef.current.play().catch(() => { });
                            }
                            return;
                        }

                        if (tileState.localTile && localVideoRef.current) {
                            localTileIdRef.current = tileState.tileId;
                            sess.audioVideo.bindVideoElement(
                                tileState.tileId,
                                localVideoRef.current,
                            );
                            // Explicitly kick playback — autoPlay is unreliable
                            // when srcObject is swapped (e.g. blur toggle).
                            localVideoRef.current.play().catch(() => { });
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
                        setRemoteScreenShareTileId((prev) => (prev === tileId ? null : prev));
                    },
                    audioVideoDidStop: (sessionStatus: MeetingSessionStatus) => {
                        // Guard against stale callbacks from React StrictMode
                        // double-mount: only act on the active session.
                        if (sessionRef.current !== sess) return;

                        const code = sessionStatus.statusCode();

                        if (code === MeetingSessionStatusCode.AudioJoinedFromAnotherDevice) {
                            teardown("chime-kicked");
                            return;
                        }

                        // If WE initiated the stop (handleEnd / unmount), skip.
                        if (stoppedByUsRef.current) return;

                        // ── Terminal codes: the meeting itself ended ─────────
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

                        // ── Recoverable: network drop, ICE failure, etc. ─────
                        // Attempt automatic reconnection if under the limit.
                        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                            console.warn(`[Chime] Session stopped (code ${code}). Attempting reconnect ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}…`);
                            reconnectAttemptsRef.current += 1;
                            isReconnectingRef.current = true;
                            setConnectionHealth("reconnecting");

                            // Clean up the dead session before re-init
                            sessionRef.current = null;
                            void stopSession(sess).catch(() => { });

                            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16_000);
                            setTimeout(() => {
                                // Abort if the user already ended the call
                                if (teardownCalledRef.current) return;
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

                // ── Content share observer (screen sharing) ────────────────
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
                // Wrapped in a 10 s timeout so a slow WASM download can't block
                // the entire session init (which has a 30 s safety timeout).
                let noiseCancellationActive = false;
                const preferredAudioId = (initialAudioDeviceId && audioDevices.some((d) => d.deviceId === initialAudioDeviceId))
                    ? initialAudioDeviceId
                    : audioDevices[0]?.deviceId ?? null;
                if (preferredAudioId) {
                    rawAudioDeviceIdRef.current = preferredAudioId;
                    try {
                        const vfResult = await withTimeout(
                            (async () => {
                                const isSupported = await VoiceFocusDeviceTransformer.isSupported(
                                    undefined,
                                    { logger },
                                );
                                if (!isSupported) return false;
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
                                    return true;
                                }
                                return false;
                            })(),
                            10_000,
                        );
                        if (vfResult === true) {
                            noiseCancellationActive = true;
                        } else {
                            // Timed out or unsupported — plain mic
                            if (vfResult === null) {
                                console.warn("[VoiceFocus] Timed out after 10 s, falling back to raw mic");
                            }
                            await sess.audioVideo.startAudioInput(preferredAudioId);
                        }
                    } catch (vfErr) {
                        // Voice Focus failed — fall back to plain microphone
                        console.warn("[VoiceFocus] Init failed, falling back to raw mic:", vfErr);
                        await sess.audioVideo.startAudioInput(preferredAudioId);
                    }
                }

                // ── Adaptive video quality ─────────────────────────────────
                // Request 720p @ 24 fps — Chime SDK and simulcast layers will
                // adapt the resolution/bitrate down based on available bandwidth.
                const preferredVideoId = (initialVideoDeviceId && videoDevices.some((d) => d.deviceId === initialVideoDeviceId))
                    ? initialVideoDeviceId
                    : videoDevices[0]?.deviceId ?? null;
                let backgroundBlurActive = false;
                if (initialCameraOn && preferredVideoId) {
                    sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                    // ── Background blur (enabled by default) ─────────────────
                    try {
                        const isBlurSupported = await BackgroundBlurVideoFrameProcessor.isSupported();
                        if (isBlurSupported) {
                            const blurProcessor = await BackgroundBlurVideoFrameProcessor.create(
                                undefined,
                                { blurStrength: 15, logger },
                            );
                            if (blurProcessor) {
                                blurProcessorRef.current = blurProcessor;
                                const transformDevice = new DefaultVideoTransformDevice(
                                    logger,
                                    preferredVideoId,
                                    [blurProcessor],
                                );
                                blurTransformDeviceRef.current = transformDevice;
                                await sess.audioVideo.startVideoInput(transformDevice);
                                backgroundBlurActive = true;
                            } else {
                                await sess.audioVideo.startVideoInput(preferredVideoId);
                            }
                        } else {
                            // Blur not supported — use raw camera
                            await sess.audioVideo.startVideoInput(preferredVideoId);
                        }
                    } catch (blurErr) {
                        console.warn("[BackgroundBlur] Init failed, falling back to raw camera:", blurErr);
                        await sess.audioVideo.startVideoInput(preferredVideoId);
                    }
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

                // If this was a reconnection, reset the reconnect counter and
                // restore connection health once the session is back up.
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

                // ── Bind remote audio element ───────────────────────────
                // Chime routes remote audio through a bound <audio> element.
                // Without this call, neither side can hear the other.
                if (remoteAudioRef.current) {
                    sess.audioVideo.bindAudioElement(remoteAudioRef.current);
                }

                // Honour pre-join lobby choices
                if (initialCameraOn) {
                    sess.audioVideo.startLocalVideoTile();
                }
                if (!initialMicOn) {
                    sess.audioVideo.realtimeMuteLocalAudio();
                }
                setNoiseCancellationOn(noiseCancellationActive);
                setBackgroundBlurOn(backgroundBlurActive);
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
    }, [retryCount]);

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
    }, [micOn, requestId]);

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
                    try {
                        const transformDevice = new DefaultVideoTransformDevice(
                            new ConsoleLogger("Blur", LogLevel.OFF),
                            videoDevices[0].deviceId,
                            [blurProcessorRef.current],
                        );
                        blurTransformDeviceRef.current = transformDevice;
                        await sess.audioVideo.startVideoInput(transformDevice);
                    } catch {
                        await sess.audioVideo.startVideoInput(videoDevices[0].deviceId);
                    }
                } else {
                    await sess.audioVideo.startVideoInput(videoDevices[0].deviceId);
                }
            }
            sess.audioVideo.startLocalVideoTile();
        }
        setCameraOn((v) => {
            const next = !v;
            try { sessionStorage.setItem(`callCamOn_${requestId}`, String(next)); } catch { /* quota */ }
            return next;
        });
    }, [cameraOn, requestId, backgroundBlurOn]);

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

    // ── Toggle background blur ───────────────────────────────────────────────

    const toggleBackgroundBlur = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess || !cameraOn) return;

        const currentVideoId = selectedVideoInput;
        if (!currentVideoId) return;

        if (backgroundBlurOn) {
            // Turn OFF → swap to raw camera immediately, then clean up the
            // old transform device in the background. Doing the swap first
            // avoids a visible freeze while the pipeline tears down.
            setBackgroundBlurOn(false);
            try {
                const oldTransform = blurTransformDeviceRef.current;
                blurTransformDeviceRef.current = null;
                // Clear the processor ref too — stop() destroys the
                // underlying WASM/WebGL resources so the instance can't
                // be reused. The next ON toggle will create a fresh one.
                blurProcessorRef.current = null;
                sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                await sess.audioVideo.startVideoInput(currentVideoId);
                // startVideoInput replaces the track on the RTCRtpSender
                // in-place (like replaceTrack) — no tile restart needed.
                // Rebind the local <video> element so the PIP picks up the
                // new (non-blurred) stream immediately.
                if (localTileIdRef.current !== null && localVideoRef.current) {
                    sess.audioVideo.bindVideoElement(localTileIdRef.current, localVideoRef.current);
                    localVideoRef.current.play().catch(() => { });
                }
                // Clean up the old transform device async — this tears down
                // the WASM/WebGL pipeline but the video has already switched.
                if (oldTransform) {
                    oldTransform.stop().catch(() => { });
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
                    const isSupported = await BackgroundBlurVideoFrameProcessor.isSupported();
                    if (!isSupported) {
                        setBackgroundBlurOn(false);
                        notifications.show({
                            title: "Not available",
                            message: "Background blur is not supported on this browser",
                            color: "yellow",
                            icon: <IconAlertCircle size={18} />,
                        });
                        return;
                    }
                    const created = await BackgroundBlurVideoFrameProcessor.create(
                        undefined,
                        { blurStrength: 15, logger: new ConsoleLogger("Blur", LogLevel.OFF) },
                    );
                    if (!created) {
                        setBackgroundBlurOn(false);
                        notifications.show({
                            title: "Not available",
                            message: "Failed to initialise background blur",
                            color: "yellow",
                            icon: <IconAlertCircle size={18} />,
                        });
                        return;
                    }
                    blurProcessor = created;
                    blurProcessorRef.current = created;
                }
                sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
                const transformDevice = new DefaultVideoTransformDevice(
                    new ConsoleLogger("Blur", LogLevel.OFF),
                    currentVideoId,
                    [blurProcessor],
                );
                blurTransformDeviceRef.current = transformDevice;
                await sess.audioVideo.startVideoInput(transformDevice);
                // startVideoInput replaces the track on the RTCRtpSender
                // in-place — no tile restart needed. Rebind so the PIP
                // shows the blurred stream immediately.
                if (localTileIdRef.current !== null && localVideoRef.current) {
                    sess.audioVideo.bindVideoElement(localTileIdRef.current, localVideoRef.current);
                    localVideoRef.current.play().catch(() => { });
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
    }, [backgroundBlurOn, cameraOn, selectedVideoInput]);

    // ── Toggle screen sharing ────────────────────────────────────────────────

    const toggleScreenShare = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        // Read the ref for the latest value — avoids stale-closure issues
        // when the observer hasn't flushed the state update yet.
        if (screenShareOnRef.current) {
            sess.audioVideo.stopContentShare();
            // Eagerly reset so rapid double-clicks don't race.
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
                // User cancelled the screen picker or browser denied permission
                const msg = (err as Error)?.message ?? "";
                if (!msg.includes("Permission denied") && !msg.includes("AbortError") && !msg.includes("NotAllowedError")) {
                    notifications.show({
                        title: "Screen share failed",
                        message: "Could not start screen sharing.",
                        color: "red",
                        icon: <IconX size={18} />,
                    });
                }
            }
        }
    }, []);

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
            sess.audioVideo.chooseVideoInputQuality(1280, 720, 24);
            // Apply background blur if enabled
            if (backgroundBlurOn && blurProcessorRef.current) {
                const transformDevice = new DefaultVideoTransformDevice(
                    new ConsoleLogger("Blur", LogLevel.OFF),
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
    }, [cameraOn, backgroundBlurOn]);

    // ── Network stats polling ────────────────────────────────────────────────
    // Always polls while the call is active so the header quality indicator
    // stays up-to-date. When the settings modal is open, the full stats are
    // also shown there.

    useEffect(() => {
        if (status !== "ready") return;
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
        const interval = setInterval(() => void pollStats(), 5000);
        return () => { stopped = true; clearInterval(interval); };
    }, [status, callDuration]);

    // ── Browser online/offline reconnection ────────────────────────────────
    // Detects network loss at the OS level (faster than waiting for Chime's
    // WebSocket to time out) and triggers an automatic reconnect when the
    // browser comes back online.
    useEffect(() => {
        if (status !== "ready" && !isReconnectingRef.current) return;

        const handleOffline = () => {
            // Don't overwrite if we're already reconnecting or tearing down
            if (teardownCalledRef.current) return;
            setConnectionHealth("reconnecting");
            notifications.show({
                title: "Network disconnected",
                message: "Waiting for your connection to resume…",
                color: "orange",
                icon: <IconWifiOff size={18} />,
                autoClose: false,
                id: "network-offline",
            });
        };

        const handleOnline = () => {
            notifications.hide("network-offline");
            // If the session is already dead (Chime fired audioVideoDidStop),
            // the reconnect is being handled by the retry logic. If the session
            // is still alive (brief blip), just clear the health warning.
            if (sessionRef.current) {
                setConnectionHealth("good");
                notifications.show({
                    title: "Back online",
                    message: "Your network connection has been restored.",
                    color: "teal",
                    icon: <IconWifi size={18} />,
                    autoClose: 3000,
                });
            } else if (!teardownCalledRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                // Session is dead and Chime hasn't triggered a retry yet — kick one off
                reconnectAttemptsRef.current += 1;
                isReconnectingRef.current = true;
                setConnectionHealth("reconnecting");
                setRetryCount((c) => c + 1);
            }
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);
        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, [status]);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────
    // M → toggle mic, V → toggle camera, S → toggle screen share, Esc → end call
    useEffect(() => {
        if (status !== "ready") return;
        const handler = (e: KeyboardEvent) => {
            // Don't intercept when typing in chat input
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            switch (e.key.toLowerCase()) {
                case "m":
                    void toggleMic();
                    break;
                case "v":
                    void toggleCamera();
                    break;
                case "s":
                    void toggleScreenShare();
                    break;
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [status, toggleMic, toggleCamera, toggleScreenShare]);

    // ── Send chat message ────────────────────────────────────────────────

    const sendChatMessage = useCallback(() => {
        const text = chatDraft.trim();
        if (!text || !conversationId || !recipientId) return;
        clearTyping();
        void sendDmMessage({
            conversationId,
            senderId: localUserId,
            recipientId,
            text,
        });
        setChatDraft("");
    }, [chatDraft, conversationId, localUserId, recipientId, clearTyping]);

    // ── Post-call feedback dismiss ──────────────────────────────────────────

    const handleFeedbackDismiss = useCallback(() => {
        setFeedbackOpen(false);
        router.push(feedbackExitRouteRef.current || exitRoute);
    }, [exitRoute, router]);

    // ── End call ────────────────────────────────────────────────────────────

    const handleEnd = useCallback(() => {
        teardown("user");
    }, [teardown]);

    // ── Render ──────────────────────────────────────────────────────────────

    if (status === "error") {
        return (
            <Stack align="center" justify="center" h="100vh" p="xl" style={{ animation: "meet-room-fade-in 0.3s ease-out" }}>
                <style>{`
                    @keyframes meet-room-fade-in {
                        from { opacity: 0; }
                        to   { opacity: 1; }
                    }
                `}</style>
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    radius="lg"
                    title="Could not start video"
                >
                    {errorMessage ?? "Unable to access camera or microphone."}
                </Alert>
                <Group mt="md">
                    <Button
                        variant="filled"
                        color="primary"
                        onClick={() => {
                            // Re-run the init effect without a full page reload
                            setStatus("initialising");
                            setErrorMessage(null);
                            setRetryCount((c) => c + 1);
                        }}
                    >
                        Retry
                    </Button>
                    <Button
                        variant="subtle"
                        color="gray"
                        leftSection={<IconHome size={16} />}
                        onClick={() => {
                            onEnd?.();
                            router.push(exitRoute);
                        }}
                    >
                        Go back
                    </Button>
                </Group>
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
            {/* Shared keyframe animations for the room UI */}
            <style>{`
                @keyframes meet-room-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes meet-room-slide-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes meet-room-slide-down {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes meet-room-scale-in {
                    from { opacity: 0; transform: scale(0.92); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes meet-room-glow {
                    0%   { transform: scale(0.92); opacity: 0.3; }
                    50%  { transform: scale(1.08); opacity: 0.7; }
                    100% { transform: scale(0.92); opacity: 0.3; }
                }
                @keyframes meet-room-float {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-6px); }
                }
                @keyframes meet-rec-pulse {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.3; }
                }
            `}</style>

            {/* ── Header island ──────────────────────────────────── */}
            <RoomHeader
                remoteUser={remoteUser}
                remoteMuted={remoteMuted}
                status={status}
                isRecording={isRecording}
                isUploadingRecording={isUploadingRecording}
                callDuration={callDuration}
                connectionHealth={connectionHealth}
                networkStats={networkStats}
                remoteAudioLevelRef={remoteAudioLevelRef}
            />

            {/* ── Patients waiting queue (doctor only) ────────────── */}
            {userKind === "doctor" && <QueueOverlay pendingQueue={pendingQueue} />}

            {/* ── Video area (full) ──────────────────────────────── */}
            <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <RemoteVideo
                    remoteTileId={remoteTileId}
                    remoteUser={remoteUser}
                    remoteMuted={remoteMuted}
                    status={status}
                    remoteVideoRef={remoteVideoRef}
                    remoteAudioRef={remoteAudioRef}
                    remoteScreenShareTileId={remoteScreenShareTileId}
                    contentShareVideoRef={contentShareVideoRef}
                />

                {/* Local video PIP */}
                <LocalPip
                    localUser={localUser}
                    cameraOn={cameraOn}
                    micOn={micOn}
                    localVideoRef={localVideoRef}
                    localAudioLevelRef={localAudioLevelRef}
                />

                {/* In-call consent banner (patient only) */}
                {consentPending && userKind === "patient" && (
                    <ConsentBanner
                        remoteUser={remoteUser}
                        acceptingConsent={acceptingConsent}
                        onAccept={() => void handleAcceptConsent()}
                        onDecline={() => void handleDeclineConsent()}
                    />
                )}

                {/* Reconnecting overlay */}
                {connectionHealth === "reconnecting" && (
                    <Box
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0,0,0,0.55)",
                            backdropFilter: "blur(4px)",
                            zIndex: 20,
                            animation: "meet-room-fade-in 0.3s ease-out",
                        }}
                    >
                        <Stack align="center" gap="md">
                            <Box
                                style={{
                                    position: "relative",
                                    animation: "meet-room-float 2.5s ease-in-out infinite",
                                }}
                            >
                                <Box
                                    style={{
                                        position: "absolute",
                                        inset: -12,
                                        borderRadius: "50%",
                                        background: "radial-gradient(circle, rgba(255,165,0,0.3) 0%, transparent 70%)",
                                        animation: "meet-room-glow 2s ease-in-out infinite",
                                    }}
                                />
                                <IconWifiOff size={40} color="var(--mantine-color-orange-4)" />
                            </Box>
                            <Stack align="center" gap={4}>
                                <Text fw={600} size="md" c="#fff">
                                    Reconnecting…
                                </Text>
                                <Text size="sm" c="rgba(255,255,255,0.65)">
                                    {reconnectAttemptsRef.current > 0
                                        ? `Attempt ${reconnectAttemptsRef.current} of ${MAX_RECONNECT_ATTEMPTS}`
                                        : "Waiting for network…"}
                                </Text>
                            </Stack>
                        </Stack>
                    </Box>
                )}
            </Box>

            {/* Chat sidebar removed as per request */}

            {/* ── Controls bar ──────────────────────────────────── */}
            <ControlBar
                micOn={micOn}
                cameraOn={cameraOn}
                chatOpen={chatOpen}
                screenShareOn={screenShareOn}
                noiseCancellationOn={noiseCancellationOn}
                backgroundBlurOn={backgroundBlurOn}
                unreadCount={unreadCount}
                userKind={userKind}
                networkStats={networkStats}
                audioInputs={audioInputs}
                videoInputs={videoInputs}
                selectedAudioInput={selectedAudioInput}
                selectedVideoInput={selectedVideoInput}
                onToggleMic={() => void toggleMic()}
                onToggleCamera={() => void toggleCamera()}
                onToggleChat={() => setChatOpen((v) => !v)}
                onToggleScreenShare={() => void toggleScreenShare()}
                onToggleNoiseCancellation={() => void toggleNoiseCancellation()}
                onToggleBackgroundBlur={() => void toggleBackgroundBlur()}
                onSwitchAudioInput={(id) => void switchAudioInput(id)}
                onSwitchVideoInput={(id) => void switchVideoInput(id)}
                onEnd={handleEnd}
                onMinimize={onMinimize}
                onNavigateDashboard={() => router.push("/doctor/dashboard")}
            />

            {/* ── Post-call feedback modal ────────────────────── */}
            <FeedbackModal
                opened={feedbackOpen}
                requestId={requestId}
                onDismiss={handleFeedbackDismiss}
            />
        </Box>
    );
}
