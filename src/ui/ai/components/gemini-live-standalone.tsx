"use client";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconLanguage,
  IconLink,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlayerStop,
  IconSend,
  IconVolume,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { colors } from "@/ui/tokens";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
  readonly [key: string]: JsonValue;
}

type GeminiLiveToolHandler = (
  args: Record<string, unknown>,
) => JsonValue | Promise<JsonValue>;

const GEMINI_LIVE_CONSTRAINED_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";
const LIVE_INPUT_SAMPLE_RATE = 16_000;
const LIVE_INPUT_CHUNK_MS = 20;
const LIVE_INPUT_CHUNK_SAMPLES =
  (LIVE_INPUT_SAMPLE_RATE * LIVE_INPUT_CHUNK_MS) / 1_000;
const DEFAULT_MIC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: LIVE_INPUT_SAMPLE_RATE,
};
const PCM_WORKLET_PROCESSOR_NAME = "gemini-live-pcm-processor";
const PCM_WORKLET_LOADED_CONTEXTS = new WeakSet<AudioContext>();
const PCM_WORKLET_SOURCE = `
class GeminiLivePcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    const channel = input?.[0];
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}

try {
  registerProcessor("${PCM_WORKLET_PROCESSOR_NAME}", GeminiLivePcmProcessor);
} catch (_e) {
  // Already registered in this AudioWorkletGlobalScope — safe to ignore.
}
`;

const SPEECH_LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "ta-IN", label: "தமிழ் (Tamil)" },
  { value: "ja-JP", label: "日本語" },
  { value: "zh-CN", label: "中文 (简体)" },
  { value: "pt-BR", label: "Português (BR)" },
  { value: "ar-SA", label: "العربية" },
  { value: "ko-KR", label: "한국어" },
  { value: "it-IT", label: "Italiano" },
  { value: "ru-RU", label: "Русский" },
];

const VOICE_OPTIONS = [
  { value: "Peri", label: "Peri (Warm, Friendly)" },
  { value: "Charon", label: "Charon (Neutral, Deep)" },
  { value: "Fenrir", label: "Fenrir (Calm, Measured)" },
  { value: "Kore", label: "Kore (Bright, Energetic)" },
];

function getWsUrlFromToken(payload: TokenResponse): string {
  if (payload.wsUrl) return payload.wsUrl;
  if (!payload.accessToken) {
    throw new Error("Token API did not return wsUrl or accessToken.");
  }

  return `${GEMINI_LIVE_CONSTRAINED_WS_URL}?access_token=${encodeURIComponent(payload.accessToken)}`;
}

function decodeBase64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);
}

function floatToPcm16(float32: Float32Array): Int16Array {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32[i] ?? 0));
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return pcm;
}

function resampleFloat32(
  input: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (sourceRate === targetRate) return input;
  if (sourceRate <= 0 || targetRate <= 0) return input;

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio;
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lowerIndex + 1, input.length - 1);
    const weight = sourceIndex - lowerIndex;
    const lower = input[lowerIndex] ?? 0;
    const upper = input[upperIndex] ?? 0;
    output[i] = lower + (upper - lower) * weight;
  }

  return output;
}

function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.length * 2);
  for (let i = 0; i < pcm.length; i += 1) {
    bytes[i * 2] = pcm[i] & 0xff;
    bytes[i * 2 + 1] = (pcm[i] >> 8) & 0xff;
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}

function getMessageLabel(role: GeminiLiveMessage["role"]): string {
  if (role === "user") return "You";
  if (role === "assistant") return "Gemini";
  return "System";
}

async function createPcmWorkletNode(
  audioContext: AudioContext,
): Promise<AudioWorkletNode> {
  if (!PCM_WORKLET_LOADED_CONTEXTS.has(audioContext)) {
    const blob = new Blob([PCM_WORKLET_SOURCE], {
      type: "text/javascript",
    });
    const moduleUrl = URL.createObjectURL(blob);

    try {
      await audioContext.audioWorklet.addModule(moduleUrl);
      PCM_WORKLET_LOADED_CONTEXTS.add(audioContext);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
  }

  return new AudioWorkletNode(audioContext, PCM_WORKLET_PROCESSOR_NAME);
}

async function decodeWebSocketMessageData(rawData: unknown): Promise<string> {
  if (typeof rawData === "string") return rawData;

  if (rawData instanceof Blob) {
    return rawData.text();
  }

  if (rawData instanceof ArrayBuffer) {
    return new TextDecoder().decode(rawData);
  }

  if (ArrayBuffer.isView(rawData)) {
    return new TextDecoder().decode(rawData);
  }

  return String(rawData);
}

export interface GeminiLiveMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly text: string;
}

export interface GeminiLiveStandaloneProps {
  readonly title?: string;
  readonly model?: string;
  readonly systemInstruction?: string;
  readonly connectGreeting?: string;
  readonly seedTurns?: readonly Readonly<{
    role: "user" | "assistant";
    text: string;
  }>[];
  readonly tokenApiPath?: string;
  readonly micAudioConstraints?: MediaTrackConstraints;
  readonly defaultSpeechLanguage?: string;
  readonly defaultVoice?: string;
  readonly autoConnect?: boolean;
  readonly autoStartMic?: boolean;
  readonly renderUi?: boolean;
  readonly tools?: Readonly<Record<string, GeminiLiveToolHandler>>;
  readonly onConnectionChange?: (connected: boolean) => void;
  readonly onInputTranscription?: (text: string) => void;
  readonly onOutputTranscription?: (text: string) => void;
  readonly onMicStatsChange?: (stats: Readonly<{
    connected: boolean;
    micEnabled: boolean;
    micLevel: number;
    bytesPerSecond: number;
    totalBytes: number;
  }>) => void;
}

type LiveState = "idle" | "connecting" | "connected" | "error";

interface TokenResponse {
  readonly wsUrl?: string;
  readonly accessToken?: string;
  readonly model?: string;
}

const DEFAULT_MODEL = "gemini-3.1-flash-live-preview";
const DEFAULT_TOKEN_PATH = "/api/live/token";
const DEFAULT_CONNECT_GREETING =
  "Say a short warm hello and ask how you can help today.";
const SETUP_TIMEOUT_MS = 10_000;

type LiveOwnerRegistration = {
  readonly ownerId: string;
  readonly forceDisconnect: (reason: string) => void;
};

type GeminiLiveGlobalState = {
  activeOwner: LiveOwnerRegistration | null;
  sockets: Set<WebSocket>;
};

function getGeminiLiveGlobalState(): GeminiLiveGlobalState {
  const runtime = globalThis as typeof globalThis & {
    __careAiGeminiLiveState?: GeminiLiveGlobalState;
  };

  if (runtime.__careAiGeminiLiveState) {
    return runtime.__careAiGeminiLiveState;
  }

  const initialized: GeminiLiveGlobalState = {
    activeOwner: null,
    sockets: new Set<WebSocket>(),
  };
  runtime.__careAiGeminiLiveState = initialized;
  return initialized;
}

function registerGlobalSocket(socket: WebSocket) {
  const globalState = getGeminiLiveGlobalState();
  globalState.sockets.add(socket);
}

function unregisterGlobalSocket(socket: WebSocket) {
  const globalState = getGeminiLiveGlobalState();
  globalState.sockets.delete(socket);
}

function closeOrphanGlobalSockets() {
  const globalState = getGeminiLiveGlobalState();
  for (const socket of globalState.sockets) {
    try {
      socket.close(1000, "superseded-by-new-live-owner");
    } catch {
      try {
        socket.close();
      } catch {
        // Ignore close failures.
      }
    }
  }
  globalState.sockets.clear();
}

function claimLiveOwner(registration: LiveOwnerRegistration) {
  const globalState = getGeminiLiveGlobalState();
  const currentOwner = globalState.activeOwner;
  if (currentOwner && currentOwner.ownerId !== registration.ownerId) {
    currentOwner.forceDisconnect("superseded-by-new-live-owner");
  }

  closeOrphanGlobalSockets();
  globalState.activeOwner = registration;
}

function releaseLiveOwner(ownerId: string) {
  const globalState = getGeminiLiveGlobalState();
  if (globalState.activeOwner?.ownerId !== ownerId) return;
  globalState.activeOwner = null;
}

export function GeminiLiveStandalone(
  props: Readonly<GeminiLiveStandaloneProps>,
) {
  const model = props.model ?? DEFAULT_MODEL;
  const tokenApiPath = props.tokenApiPath ?? DEFAULT_TOKEN_PATH;
  const instanceOwnerIdRef = useRef(`gemini-live-${crypto.randomUUID()}`);

  const [state, setState] = useState<LiveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<GeminiLiveMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micBytesPerSecond, setMicBytesPerSecond] = useState(0);
  const [totalMicBytesSent, setTotalMicBytesSent] = useState(0);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState<string | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState(props.defaultSpeechLanguage ?? "");
  const [selectedVoice, setSelectedVoice] = useState(props.defaultVoice ?? "");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const pendingMicSamplesRef = useRef<number[]>([]);
  const micBytesThisSecondRef = useRef(0);
  const totalMicBytesSentRef = useRef(0);
  const lastMicLevelUiUpdateMsRef = useRef(0);
  const micStatsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSentGreetingRef = useRef(false);
  const delayedGreetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayedMicStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsGenerationRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const sessionHandleRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const stateRef = useRef<LiveState>("idle");
  const shouldAutoStartMicRef = useRef(false);
  const hasSeededHistoryRef = useRef(false);
  const shouldUseInitialHistoryRef = useRef(false);
  const connectAbortRef = useRef<AbortController | null>(null);
  const onMicStatsChangeRef = useRef(props.onMicStatsChange);
  const socketPoolRef = useRef<Set<WebSocket>>(new Set());
  const lastEmittedMicStatsRef = useRef<{
    connected: boolean;
    micEnabled: boolean;
    micLevel: number;
    bytesPerSecond: number;
    totalBytes: number;
  } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onMicStatsChangeRef.current = props.onMicStatsChange;
  }, [props.onMicStatsChange]);

  useEffect(() => {
    const nextStats = {
      connected: state === "connected",
      micEnabled,
      micLevel,
      bytesPerSecond: micBytesPerSecond,
      totalBytes: totalMicBytesSent,
    };

    const prev = lastEmittedMicStatsRef.current;
    if (
      prev &&
      prev.connected === nextStats.connected &&
      prev.micEnabled === nextStats.micEnabled &&
      prev.bytesPerSecond === nextStats.bytesPerSecond &&
      prev.totalBytes === nextStats.totalBytes &&
      Math.abs(prev.micLevel - nextStats.micLevel) < 0.02
    ) {
      return;
    }

    lastEmittedMicStatsRef.current = nextStats;
    onMicStatsChangeRef.current?.(nextStats);
  }, [
    micBytesPerSecond,
    micEnabled,
    micLevel,
    state,
    totalMicBytesSent,
  ]);

  useEffect(() => {
    if (props.autoConnect) {
      // New live open should reflect current chat context, not an older resumed handle.
      sessionHandleRef.current = null;
      hasSeededHistoryRef.current = false;
      void connectSession();
      return;
    }

    stopMic();
    hasSeededHistoryRef.current = false;
    disconnectSession();
    // React Compiler handles memoization; keep dependency list explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.autoConnect]);

  useEffect(() => {
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimerRef.current !== null) {
        globalThis.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      clearDelayedGreetingTimer();
      clearDelayedMicStartTimer();
      clearSetupTimeout();
      stopMic();
      disconnectSession();
      releaseLiveOwner(instanceOwnerIdRef.current);
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
    // unmount cleanup only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void enumerateMicDevices();
    const onDeviceChange = () => void enumerateMicDevices();
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enumerateMicDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicDevices(devices.filter((d) => d.kind === "audioinput"));
    } catch {
      // Permissions not yet granted — labels populate after first getUserMedia
    }
  }

  function addMessage(role: GeminiLiveMessage["role"], text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, text: text.trim() },
    ]);
  }

  function emitConnectionChange(connected: boolean) {
    props.onConnectionChange?.(connected);
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current === null) return;
    globalThis.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }

  function clearDelayedMicStartTimer() {
    if (delayedMicStartTimerRef.current === null) return;
    globalThis.clearTimeout(delayedMicStartTimerRef.current);
    delayedMicStartTimerRef.current = null;
  }

  function clearDelayedGreetingTimer() {
    if (delayedGreetingTimerRef.current === null) return;
    globalThis.clearTimeout(delayedGreetingTimerRef.current);
    delayedGreetingTimerRef.current = null;
  }

  function clearSetupTimeout() {
    if (setupTimeoutRef.current === null) return;
    globalThis.clearTimeout(setupTimeoutRef.current);
    setupTimeoutRef.current = null;
  }

  function startSetupTimeout(generation: number) {
    clearSetupTimeout();
    setupTimeoutRef.current = globalThis.setTimeout(() => {
      setupTimeoutRef.current = null;
      if (generation !== wsGenerationRef.current) return;
      if (stateRef.current !== "connecting") return;

      setError("Live setup timed out. Please try again.");
      const ws = wsRef.current;
      if (ws) {
        closeSocket(ws, "setup-timeout");
      }

      stateRef.current = "error";
      setState("error");
      emitConnectionChange(false);
    }, SETUP_TIMEOUT_MS);
  }

  function abortConnectAttempt() {
    if (connectAbortRef.current === null) return;
    connectAbortRef.current.abort();
    connectAbortRef.current = null;
  }

  function closeSocket(ws: WebSocket | null, reason: string) {
    if (!ws) return;
    socketPoolRef.current.delete(ws);
    unregisterGlobalSocket(ws);
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState !== WebSocket.CLOSED) {
      try {
        ws.close(1000, reason);
      } catch {
        try {
          ws.close();
        } catch {
          // Ignore close failures.
        }
      }
    }
  }

  function closeAllSockets(reason: string) {
    for (const socket of socketPoolRef.current) {
      closeSocket(socket, reason);
    }
    socketPoolRef.current.clear();
  }

  function disconnectSessionWithReason(reason: string) {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    clearDelayedGreetingTimer();
    clearDelayedMicStartTimer();
    clearSetupTimeout();
    abortConnectAttempt();
    stopMic();
    hasSentGreetingRef.current = false;
    hasSeededHistoryRef.current = false;
    shouldAutoStartMicRef.current = false;
    wsGenerationRef.current += 1;
    if (wsRef.current) {
      closeSocket(wsRef.current, reason);
      wsRef.current = null;
    }
    closeAllSockets(reason);
    emitConnectionChange(false);
    stateRef.current = "idle";
    setState("idle");
    releaseLiveOwner(instanceOwnerIdRef.current);
  }

  function buildSeedTurns() {
    const source = props.seedTurns ?? [];
    const turns = source
      .map((turn) => {
        const role: "model" | "user" =
          turn.role === "assistant" ? "model" : "user";
        const text = turn.text.trim().slice(0, 1_200);
        if (!text) return null;
        return {
          role,
          parts: [{ text }],
        };
      })
      .filter(
        (
          turn,
        ): turn is { role: "user" | "model"; parts: Array<{ text: string }> } =>
          turn !== null,
      );

    const deduped: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    for (const turn of turns) {
      const prev = deduped[deduped.length - 1];
      if (
        prev &&
        prev.role === turn.role &&
        (prev.parts[0]?.text ?? "") === (turn.parts[0]?.text ?? "")
      ) {
        continue;
      }
      deduped.push(turn);
    }

    const windowed = deduped.slice(-20);
    const firstUserIndex = windowed.findIndex((turn) => turn.role === "user");
    if (firstUserIndex < 0) {
      const synthesizedContext = windowed
        .map((turn) => {
          const label = turn.role === "model" ? "Assistant" : "User";
          const text = turn.parts[0]?.text?.trim() ?? "";
          if (!text) return "";
          return `${label}: ${text}`;
        })
        .filter((line) => line.length > 0)
        .join("\n")
        .slice(0, 2_400)
        .trim();

      if (!synthesizedContext) {
        return [];
      }

      return [
        {
          role: "user",
          parts: [
            {
              text: `Recent conversation context:\n${synthesizedContext}`,
            },
          ],
        },
      ];
    }

    return windowed.slice(firstUserIndex);
  }

  function buildSeedContextSummary(): string {
    const source = props.seedTurns ?? [];
    const lines = source
      .slice(-16)
      .map((turn) => {
        const roleLabel = turn.role === "assistant" ? "Assistant" : "User";
        const text = turn.text.trim();
        if (!text) return "";
        return `${roleLabel}: ${text}`;
      })
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return "";
    }

    return lines.join("\n").slice(0, 2_800).trim();
  }

  function seedConversationHistory(ws: WebSocket | null) {
    if (!ws) return;
    const turns = buildSeedTurns();
    if (turns.length === 0) return;

    ws.send(
      JSON.stringify({
        clientContent: {
          turns,
          turnComplete: true,
        },
      }),
    );
  }

  function scheduleReconnect(delayMs: number) {
    if (!props.autoConnect) return;
    if (manualDisconnectRef.current) return;
    if (stateRef.current === "connecting" || stateRef.current === "connected") return;
    if (reconnectAttemptsRef.current >= 5) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearReconnectTimer();
    reconnectAttemptsRef.current += 1;
    reconnectTimerRef.current = globalThis.setTimeout(() => {
      if (manualDisconnectRef.current) return;
      void connectSession();
    }, delayMs);
  }

  async function connectSession() {
    if (!props.autoConnect) return;
    if (stateRef.current === "connected" || stateRef.current === "connecting") return;

    claimLiveOwner({
      ownerId: instanceOwnerIdRef.current,
      forceDisconnect: (reason) => {
        disconnectSessionWithReason(reason);
      },
    });

    manualDisconnectRef.current = false;
    clearReconnectTimer();
    clearDelayedGreetingTimer();
    clearDelayedMicStartTimer();
    clearSetupTimeout();
    abortConnectAttempt();

    wsGenerationRef.current += 1;
    const currentGeneration = wsGenerationRef.current;

    stateRef.current = "connecting";
    setState("connecting");
    setError(null);

    if (wsRef.current) {
      closeSocket(wsRef.current, "reconnect");
      wsRef.current = null;
    }
    closeAllSockets("reconnect");

    hasSentGreetingRef.current = false;
    shouldAutoStartMicRef.current = props.autoStartMic === true;
    shouldUseInitialHistoryRef.current =
      buildSeedTurns().length > 0;

    const abortController = new AbortController();
    connectAbortRef.current = abortController;

    try {
      console.log("[GeminiLive] Requesting token from", tokenApiPath);
      const tokenRes = await fetch(tokenApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          model,
          responseModalities: ["AUDIO"],
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        const errorMsg = `Token request failed (${tokenRes.status}): ${body}`;
        console.error("[GeminiLive]", errorMsg);
        throw new Error(errorMsg);
      }

      const tokenPayload = (await tokenRes.json()) as TokenResponse;
      if (connectAbortRef.current === abortController) {
        connectAbortRef.current = null;
      }

      if (
        manualDisconnectRef.current ||
        currentGeneration !== wsGenerationRef.current
      ) {
        return;
      }

      console.log("[GeminiLive] Token received, model:", tokenPayload.model);
      const wsUrl = getWsUrlFromToken(tokenPayload);
      console.log("[GeminiLive] Connecting to WebSocket:", wsUrl.slice(0, 80));
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      socketPoolRef.current.add(ws);
      registerGlobalSocket(ws);

      ws.onopen = () => {
        if (!props.autoConnect) {
          closeSocket(ws, "auto-connect-disabled");
          return;
        }

        if (currentGeneration !== wsGenerationRef.current) {
          closeSocket(ws, "stale-session");
          return;
        }

        const baseInstruction =
          props.systemInstruction ??
          "You are a helpful realtime medical assistant. Keep responses concise and safe.";
        const seedContextSummary = buildSeedContextSummary();
        const effectiveSystemInstruction = seedContextSummary
          ? `${baseInstruction}\n\nRecent chat context:\n${seedContextSummary}\n\nUse this context to stay consistent with prior conversation. If newer user input conflicts, follow the latest user input.`
          : baseInstruction;

        console.log("[GeminiLive] WebSocket connected, sending setup message");
        const setupMessage = {
          setup: {
            model: `models/${tokenPayload.model ?? model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              temperature: 0.6,
            },
            systemInstruction: {
              parts: [
                {
                  text: effectiveSystemInstruction,
                },
              ],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: sessionHandleRef.current
              ? { handle: sessionHandleRef.current }
              : {},
            historyConfig: {
              initialHistoryInClientContent: false,
            },
            contextWindowCompression: {
              slidingWindow: {},
            },
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
              },
            },
          },
        };

        console.log("[GeminiLive] Setup message:", JSON.stringify(setupMessage, null, 2));
        ws.send(JSON.stringify(setupMessage));
        startSetupTimeout(currentGeneration);

      };

      ws.onmessage = (event) => {
        if (currentGeneration !== wsGenerationRef.current) return;
        void handleServerMessage(event.data);
      };

      ws.onerror = (event) => {
        if (currentGeneration !== wsGenerationRef.current) return;
        console.error("[GeminiLive] WebSocket error:", event);
        // Let onclose drive terminal connection state transitions.
        // Browsers may emit transient socket errors before/without immediate close.
        if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          return;
        }
        setError("Transient network issue detected. Attempting to recover...");
      };

      ws.onclose = (event) => {
        if (currentGeneration !== wsGenerationRef.current) return;

        console.log("[GeminiLive] WebSocket closed, code:", event.code, "reason:", event.reason);
        clearSetupTimeout();
        stopMic();
        socketPoolRef.current.delete(ws);
        unregisterGlobalSocket(ws);
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        stateRef.current = "idle";
        setState("idle");
        emitConnectionChange(false);

        const shouldReconnect =
          !manualDisconnectRef.current &&
          event.code !== 1000 &&
          event.code !== 1001 &&
          event.code !== 1007 &&
          event.code !== 1008;

        if (shouldReconnect) {
          scheduleReconnect(800);
        }
      };
    } catch (err) {
      if (connectAbortRef.current === abortController) {
        connectAbortRef.current = null;
      }
      clearSetupTimeout();

      if (abortController.signal.aborted) {
        return;
      }

      if (currentGeneration !== wsGenerationRef.current) {
        return;
      }

      const errMsg = err instanceof Error ? err.message : "Failed to connect.";
      console.error("[GeminiLive] Connection failed:", errMsg);
      stateRef.current = "error";
      setState("error");
      setError(errMsg);
      emitConnectionChange(false);

      scheduleReconnect(1_200);
    }
  }

  function disconnectSession() {
    disconnectSessionWithReason("manual-disconnect");
  }

  function clearPlaybackQueue() {
    if (!audioContextRef.current) return;
    playbackTimeRef.current = audioContextRef.current.currentTime;
  }

  function enqueuePcm24k(base64Audio: string) {
    const bytes = decodeBase64ToUint8(base64Audio);
    const sampleCount = Math.floor(bytes.length / 2);
    const pcm = new Int16Array(sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
      const lo = bytes[i * 2] ?? 0;
      const hi = bytes[i * 2 + 1] ?? 0;
      const value = (hi << 8) | lo;
      pcm[i] = value > 32767 ? value - 65536 : value;
    }

    const floatData = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
      floatData[i] = pcm[i] / 32768;
    }

    const audioContext =
      audioContextRef.current ??
      new AudioContext({ latencyHint: "interactive" });
    audioContextRef.current = audioContext;

    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {
        // Resume can require a user gesture in some browsers.
      });
    }

    const buffer = audioContext.createBuffer(1, floatData.length, 24_000);
    buffer.copyToChannel(floatData, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    const now = audioContext.currentTime + 0.01;
    const startAt = Math.max(playbackTimeRef.current, now);
    source.start(startAt);
    playbackTimeRef.current = startAt + buffer.duration;
  }

  async function executeToolCalls(functionCalls: unknown[]) {
    const availableTools = props.tools;
    if (!availableTools) return;

    const functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }> = [];

    for (const rawCall of functionCalls) {
      const call = rawCall as {
        id?: string;
        name?: string;
        args?: Record<string, unknown>;
      };

      if (!call.id || !call.name) continue;
      const toolFn = availableTools[call.name];

      if (!toolFn) {
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: { error: `Tool '${call.name}' is not registered.` },
        });
        continue;
      }

      try {
        const result = await toolFn(call.args ?? {});
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: { result },
        });
      } catch (err) {
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: {
            error:
              err instanceof Error
                ? err.message
                : "Tool execution failed unexpectedly.",
          },
        });
      }
    }

    if (!functionResponses.length) return;
    wsRef.current?.send(
      JSON.stringify({ toolResponse: { functionResponses } }),
    );
  }

  async function handleServerMessage(rawData: unknown) {
    try {
      const messageText = await decodeWebSocketMessageData(rawData);
      const payload = JSON.parse(messageText) as Record<string, unknown>;

      console.log("[GeminiLive] Server message keys:", Object.keys(payload));

      if (payload.setupComplete) {
        if (!props.autoConnect) return;
        clearSetupTimeout();

        console.log("[GeminiLive] ✓ Setup complete confirmed");
        reconnectAttemptsRef.current = 0;
        stateRef.current = "connected";
        setState("connected");
        emitConnectionChange(true);
        addMessage("system", "Gemini Live session connected.");

        const shouldSeedHistory = false;

        const connectGreetingText =
          props.connectGreeting?.trim() || DEFAULT_CONNECT_GREETING;
        let sentGreeting = false;
        if (!hasSentGreetingRef.current && connectGreetingText) {
          hasSentGreetingRef.current = true;
          const greetingDelayMs = 0;
          if (greetingDelayMs > 0) {
            const generation = wsGenerationRef.current;
            clearDelayedGreetingTimer();
            delayedGreetingTimerRef.current = globalThis.setTimeout(() => {
              delayedGreetingTimerRef.current = null;
              if (!props.autoConnect) return;
              if (generation !== wsGenerationRef.current) return;
              if (stateRef.current !== "connected") return;
              sendRealtimeInput({ text: connectGreetingText });
            }, greetingDelayMs);
          } else {
            sendRealtimeInput({ text: connectGreetingText });
          }
          sentGreeting = true;
        }

        if (shouldAutoStartMicRef.current && !micEnabled) {
          shouldAutoStartMicRef.current = false;

          let micStartDelayMs = 0;
          if (sentGreeting) {
            const greetingDelayMs = 0;
            micStartDelayMs = Math.max(micStartDelayMs, greetingDelayMs + 900);
          }

          if (micStartDelayMs > 0) {
            const generation = wsGenerationRef.current;
            clearDelayedMicStartTimer();
            delayedMicStartTimerRef.current = globalThis.setTimeout(() => {
              delayedMicStartTimerRef.current = null;
              if (!props.autoConnect) return;
              if (generation !== wsGenerationRef.current) return;
              if (stateRef.current !== "connected") return;
              if (mediaStreamRef.current) return;
              void startMic();
            }, micStartDelayMs);
          } else {
            void startMic();
          }
        }
      }

      const resumptionUpdate = payload.sessionResumptionUpdate as
        | { newHandle?: string; resumable?: boolean }
        | undefined;
      if (resumptionUpdate?.resumable && resumptionUpdate.newHandle) {
        sessionHandleRef.current = resumptionUpdate.newHandle;
      }

      if (payload.goAway) {
        console.warn("[GeminiLive] ⚠ Server sent GoAway:", payload.goAway);
        setError("Session ended by server (GoAway message received)");
      }

      const serverContent = payload.serverContent as
        | {
          interrupted?: boolean;
          inputTranscription?: { text?: string };
          outputTranscription?: { text?: string };
          modelTurn?: { parts?: Array<Record<string, unknown>> };
        }
        | undefined;

      if (serverContent?.interrupted) {
        console.log("[GeminiLive] Stream interrupted by server");
        clearPlaybackQueue();
      }

      const inputText = serverContent?.inputTranscription?.text;
      if (inputText) {
        console.log("[GeminiLive] User speech:", inputText);
        props.onInputTranscription?.(inputText);
      }

      const outputText = serverContent?.outputTranscription?.text;
      if (outputText) {
        console.log("[GeminiLive] Assistant response:", outputText);
        props.onOutputTranscription?.(outputText);
        addMessage("assistant", outputText);
      }

      const parts = serverContent?.modelTurn?.parts ?? [];
      for (const part of parts) {
        const inlineData = part.inlineData as { data?: string } | undefined;
        if (inlineData?.data) {
          console.log("[GeminiLive] Audio chunk received");
          enqueuePcm24k(inlineData.data);
        }
        const textPart = part.text;
        if (typeof textPart === "string" && textPart.trim()) {
          addMessage("assistant", textPart);
        }
      }

      const toolCall = payload.toolCall as
        | { functionCalls?: unknown[] }
        | undefined;
      if (toolCall?.functionCalls?.length) {
        console.log("[GeminiLive] Tool call:", toolCall.functionCalls.length, "function(s)");
        void executeToolCalls(toolCall.functionCalls);
      }
    } catch (err) {
      console.error("[GeminiLiveStandalone] Failed to parse server message", err);
    }
  }

  function sendRealtimeInput(payload: Record<string, unknown>) {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setError("Session is not connected.");
      return;
    }
    wsRef.current.send(JSON.stringify({ realtimeInput: payload }));
  }

  function sendPcmChunk(pcm: Int16Array) {
    const bytesSent = pcm.length * 2;
    micBytesThisSecondRef.current += bytesSent;
    totalMicBytesSentRef.current += bytesSent;

    const base64 = pcmToBase64(pcm);
    sendRealtimeInput({
      audio: {
        data: base64,
        mimeType: `audio/pcm;rate=${LIVE_INPUT_SAMPLE_RATE}`,
      },
    });
  }

  function queueMicPcm(pcm: Int16Array) {
    const pending = pendingMicSamplesRef.current;
    for (const sample of pcm) {
      pending.push(sample);
    }

    while (pending.length >= LIVE_INPUT_CHUNK_SAMPLES) {
      const chunk = pending.splice(0, LIVE_INPUT_CHUNK_SAMPLES);
      sendPcmChunk(Int16Array.from(chunk));
    }
  }

  function flushPendingMicPcm() {
    const pending = pendingMicSamplesRef.current;
    if (!pending.length) return;
    sendPcmChunk(Int16Array.from(pending));
    pendingMicSamplesRef.current = [];
  }

  function startMicStatsTicker() {
    if (micStatsTimerRef.current !== null) return;

    micStatsTimerRef.current = globalThis.setInterval(() => {
      setMicBytesPerSecond(micBytesThisSecondRef.current);
      micBytesThisSecondRef.current = 0;
      setTotalMicBytesSent(totalMicBytesSentRef.current);
      setMicLevel((prev) => Math.max(0, prev * 0.85));
    }, 1_000);
  }

  function stopMicStatsTicker() {
    if (micStatsTimerRef.current !== null) {
      globalThis.clearInterval(micStatsTimerRef.current);
      micStatsTimerRef.current = null;
    }

    micBytesThisSecondRef.current = 0;
    totalMicBytesSentRef.current = 0;
    setMicBytesPerSecond(0);
    setTotalMicBytesSent(0);
    setMicLevel(0);
  }

  function sendText() {
    const text = textInput.trim();
    if (!text) return;
    sendRealtimeInput({ text });
    addMessage("user", text);
    setTextInput("");
  }

  async function startMic() {
    if (micEnabled) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setError("Connect Gemini Live before starting microphone.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...DEFAULT_MIC_AUDIO_CONSTRAINTS,
          ...props.micAudioConstraints,
          ...(selectedMicDeviceId ? { deviceId: { exact: selectedMicDeviceId } } : {}),
        },
      });
      // Re-enumerate now that permission is granted — labels become available
      await enumerateMicDevices();
      mediaStreamRef.current = stream;

      const audioContext =
        audioContextRef.current ??
        new AudioContext({ latencyHint: "interactive" });
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const workletNode = await createPcmWorkletNode(audioContext);
      workletNodeRef.current = workletNode;
      startMicStatsTicker();

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const resampled = resampleFloat32(
          event.data,
          audioContext.sampleRate,
          LIVE_INPUT_SAMPLE_RATE,
        );

        if (resampled.length > 0) {
          let sumSquares = 0;
          for (const sample of resampled) {
            sumSquares += sample * sample;
          }
          const rms = Math.sqrt(sumSquares / resampled.length);
          const nextLevel = Math.min(1, rms * 3);
          const now = Date.now();
          if (now - lastMicLevelUiUpdateMsRef.current >= 120) {
            lastMicLevelUiUpdateMsRef.current = now;
            setMicLevel((prev) =>
              Math.abs(prev - nextLevel) < 0.02 ? prev : nextLevel,
            );
          }
        }

        const pcm = floatToPcm16(resampled);
        queueMicPcm(pcm);
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      setMicEnabled(true);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to access microphone for live streaming.",
      );
    }
  }

  function stopMic() {
    flushPendingMicPcm();
    stopMicStatsTicker();

    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ realtimeInput: { audioStreamEnd: true } }),
      );
    }

    setMicEnabled(false);
  }

  function toggleMic() {
    if (micEnabled) {
      stopMic();
      return;
    }
    void startMic();
  }

  function getStateColor(current: LiveState): string {
    if (current === "connected") return colors.success;
    if (current === "connecting") return colors.warning;
    if (current === "error") return colors.danger;
    return colors.muted;
  }

  function getStateLabel(current: LiveState): string {
    if (current === "connected") return "Connected";
    if (current === "connecting") return "Connecting";
    if (current === "error") return "Error";
    return "Idle";
  }

  const canSend = state === "connected" && textInput.trim().length > 0;
  const micButtonColor = micEnabled ? colors.danger : colors.brand;
  const micButtonIcon = micEnabled ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />;
  const micButtonLabel = micEnabled ? "Stop microphone" : "Start microphone";
  const micDeviceOptions = micDevices.map((d, i) => ({
    value: d.deviceId,
    label: d.label || `Microphone ${i + 1}`,
  }));

  if (props.renderUi === false) {
    return null;
  }

  return (
    <Paper withBorder radius="lg" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={700}>{props.title ?? "Gemini Live"}</Text>
          <Badge color={getStateColor(state)} variant="light">
            {getStateLabel(state)}
          </Badge>
        </Group>

        <Group gap="xs" wrap="wrap">
          <Select
            size="xs"
            placeholder="Default microphone"
            data={micDeviceOptions}
            value={selectedMicDeviceId}
            onChange={setSelectedMicDeviceId}
            disabled={micEnabled}
            clearable
            style={{ flex: 1, minWidth: 160 }}
            leftSection={<IconMicrophone size={14} />}
          />
          <Select
            size="xs"
            placeholder="Auto-detect language"
            data={SPEECH_LANGUAGE_OPTIONS}
            value={speechLanguage || null}
            onChange={(v) => setSpeechLanguage(v ?? "")}
            disabled={true}
            clearable
            title="Language selection not yet supported in Live API v1alpha"
            style={{ flex: 1, minWidth: 160 }}
            leftSection={<IconLanguage size={14} />}
          />
          <Select
            size="xs"
            placeholder="Default voice"
            data={VOICE_OPTIONS}
            value={selectedVoice || null}
            onChange={(v) => setSelectedVoice(v ?? "")}
            disabled={true}
            title="Voice selection not yet supported in Live API v1alpha"
            clearable
            style={{ flex: 1, minWidth: 160 }}
            leftSection={<IconVolume size={14} />}
          />
        </Group>

        <Group gap="xs" wrap="wrap">
          <Button
            leftSection={<IconLink size={16} />}
            onClick={() => void connectSession()}
            disabled={state === "connected" || state === "connecting"}
          >
            Connect
          </Button>
          <Button
            color={colors.danger}
            variant="light"
            leftSection={<IconPlayerStop size={16} />}
            onClick={disconnectSession}
            disabled={state !== "connected" && state !== "error"}
          >
            Disconnect
          </Button>
          <ActionIcon
            size="lg"
            radius="xl"
            color={micButtonColor}
            variant={micEnabled ? "filled" : "light"}
            onClick={toggleMic}
            disabled={state !== "connected"}
            aria-label={micButtonLabel}
            title={micButtonLabel}
          >
            {micButtonIcon}
          </ActionIcon>
        </Group>

        <Group align="flex-end" gap="xs" wrap="nowrap">
          <TextInput
            value={textInput}
            onChange={(event) => setTextInput(event.currentTarget.value)}
            placeholder="Send realtime text input..."
            style={{ flex: 1 }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              sendText();
            }}
            disabled={state !== "connected"}
          />
          <ActionIcon
            size="lg"
            radius="xl"
            color={colors.brand}
            variant="filled"
            onClick={sendText}
            disabled={!canSend}
            aria-label="Send realtime text"
          >
            <IconSend size={16} />
          </ActionIcon>
        </Group>

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Text size="xs" c="dimmed">
          Mic level: {Math.round(micLevel * 100)}% · Outgoing audio: {Math.round(micBytesPerSecond / 1024)} KB/s · Sent: {Math.round(totalMicBytesSent / 1024)} KB
        </Text>

        <Box>
          <Text size="xs" c="dimmed" mb={6}>
            Realtime transcript
          </Text>
          <ScrollArea h={220} offsetScrollbars>
            <Stack gap={6}>
              {messages.length === 0 && (
                <Text size="sm" c="dimmed">
                  No messages yet. Connect and start talking or send text.
                </Text>
              )}
              {messages.map((message) => {
                const isUser = message.role === "user";
                const bubbleBg = isUser
                  ? "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.2))"
                  : "light-dark(var(--mantine-color-gray-0), rgba(255,255,255,0.06))";
                const label = getMessageLabel(message.role);

                return (
                  <Paper key={message.id} withBorder radius="md" p="xs" style={{ background: bubbleBg }}>
                    <Text size="xs" fw={700} c="dimmed" mb={2}>
                      {label}
                    </Text>
                    <Text size="sm">{message.text}</Text>
                  </Paper>
                );
              })}
            </Stack>
          </ScrollArea>
        </Box>
      </Stack>
    </Paper>
  );
}
