---
name: gemini-live-api
description: "**GEMINI LIVE API SKILL** — Real-time Gemini Live API implementation patterns for this Next.js 16 + React 19 + TypeScript project. USE FOR: voice/video streaming architecture; Live API WebSocket sessions; setup/realtimeInput/clientContent/toolResponse message design; interruption handling; VAD tuning; session resumption; context window compression; GoAway handling; ephemeral token security for browser-direct connections; model migration caveats for gemini-3.1-flash-live-preview. DO NOT USE FOR: Firestore CRUD/domain modeling (use data-layer skill); Mantine component styling (use frontend skill); generic non-realtime chat flows (use ai-sdk skill)."
---

# Gemini Live API — Realtime Voice/Video Patterns

_Last reviewed: 2026-03 (Gemini Live docs/API reference)_

## Golden Rules

1. **Prefer server-to-server for protected backends**; use browser-direct WebSocket only with **ephemeral tokens**.
2. **First client message must be setup/config** and you should wait for `setupComplete` before sending user input.
3. **Use `realtimeInput` for ongoing conversation updates** (audio/video/text). For `gemini-3.1-flash-live-preview`, `clientContent` is mainly for initial seeded history.
4. **Treat server events as multi-part** — a single server content event can contain multiple parts (audio + transcript, etc.). Iterate all parts.
5. **Implement interruption-safe playback** — if `serverContent.interrupted === true`, stop and clear queued audio immediately.
6. **Plan for disconnects by default** — handle `goAway`, `sessionResumptionUpdate`, and reconnect with resumption handle.
7. **Enable context window compression for long sessions** — audio tokens accumulate quickly (~25 tokens/sec).
8. **Keep audio format contract strict** — input: raw PCM 16-bit little-endian (`audio/pcm;rate=16000`), output: raw PCM 24kHz.
9. **Tool calls are manual in Live API** — execute locally, then send `toolResponse` with matching function call IDs.
10. **Model limitations matter** — in `gemini-3.1-flash-live-preview`, async function-calling is not supported; proactive audio and affective dialog are not supported.

---

## When to Use This Skill

Use this skill when a task asks for any of the following:

- Real-time mic/camera streaming with Gemini
- Live API WebSocket setup and event handling
- Low-latency voice agent architecture decisions
- Ephemeral token endpoint + browser integration
- VAD, barge-in, and playback interruption fixes
- Session resumption / long-call reliability
- Live API tool-calling loops
- Migrating from `gemini-2.5-flash-native-audio-preview-12-2025` to `gemini-3.1-flash-live-preview`

---

## Choose the Right Integration Pattern

### A) Server-to-server (recommended default)

Use when:

- Backend can safely hold API key/credentials
- You need centralized policy/logging/tool execution
- You can tolerate one extra network hop from browser to backend

Pattern:

1. Browser streams mic/video to your backend channel
2. Backend maintains Live API session
3. Backend forwards model audio/transcripts back to browser

### B) Client-to-server (browser direct to Gemini)

Use when:

- Lowest latency is critical
- You want direct media path to Gemini
- You can provision **ephemeral token** securely from backend

Pattern:

1. Browser authenticates to your backend
2. Backend creates short-lived ephemeral token
3. Browser opens Live API WebSocket using token
4. Browser streams media directly

Security note: never ship long-lived API keys to the browser.

---

## WebSocket Session Contract (Live API)

### Endpoint basics

- Standard key flow uses `v1beta` WebSocket endpoint
- Ephemeral token constrained flow uses `v1alpha` constrained endpoint

### Client message union

A client WebSocket message contains exactly one of:

- `setup`
- `clientContent`
- `realtimeInput`
- `toolResponse`

### Server message union

A server message may include `usageMetadata` and exactly one primary union field:

- `setupComplete`
- `serverContent`
- `toolCall`
- `toolCallCancellation`
- `goAway`
- `sessionResumptionUpdate`

---

## Message Semantics You Must Implement

### `setup`

- Sent first
- Includes model, generation config, system instruction, tools, input config
- Not mutable during an active connection (except via reconnect/resume path)

### `clientContent`

- Appended directly to conversation history
- Can interrupt generation
- For `gemini-3.1-flash-live-preview`, use primarily for initial seeded history (`historyConfig.initialHistoryInClientContent`)
- When seeding history, send `turnComplete: true` before switching to ongoing `realtimeInput`

### `realtimeInput`

- For low-latency concurrent streams (`audio`, `video`, `text`)
- Cross-stream ordering is not guaranteed
- End-of-turn is derived from activity (automatic VAD or manual activity markers)
- For `gemini-3.1-flash-live-preview`, use this for ongoing text turns (not `clientContent`)

### `serverContent`

Important fields:

- `generationComplete`
- `turnComplete`
- `interrupted`
- `modelTurn`
- `inputTranscription` / `outputTranscription`

Implementation detail: do not assume one part per event; process all `modelTurn.parts`.

---

## Audio/Video Contracts

### Audio input

- Raw PCM 16-bit little-endian
- Prefer 16kHz input (`audio/pcm;rate=16000`)
- If source is 44.1kHz/48kHz, resample before sending

### Audio output

- Raw PCM 24kHz chunks
- Client should queue and play chunks progressively

### Video input

- Send individual JPEG/PNG frames
- Keep to <= 1 FPS unless your use case explicitly needs more frame pressure management

---

## VAD and Barge-In

### Automatic VAD (default)

- Configure via `realtimeInputConfig.automaticActivityDetection`
- Tune:
  - `startOfSpeechSensitivity`
  - `endOfSpeechSensitivity`
  - `prefixPaddingMs`
  - `silenceDurationMs`

When mic stream pauses, send `audioStreamEnd: true` to flush.

### Manual VAD

If automatic VAD disabled, client must send:

- `activityStart`
- `activityEnd`

### Interruption handling

On `serverContent.interrupted === true`:

1. stop playback immediately
2. clear buffered audio queue
3. cancel pending local tool side-effects when paired with `toolCallCancellation`

---

## Tool Calling in Live Sessions

Live API tool loop:

1. Receive `toolCall.functionCalls[]`
2. Execute function(s) locally
3. Send `toolResponse.functionResponses[]` with matching `id`

Guidelines:

- Return structured JSON objects
- Catch and return function errors in response payload
- Keep tool functions idempotent where possible (interruptions can trigger cancellation flows)

Model caveat:

- `gemini-3.1-flash-live-preview`: function calling is synchronous (conversation waits for tool response)

---

## Session Lifetime, Resumption, and Reliability

### Limits and defaults

- Audio-only sessions: ~15 minutes without compression
- Audio+video sessions: ~2 minutes without compression
- A single connection can be reset by server around ~10 minutes
- Session resumption handles are valid for up to ~2 hours after last termination

### Make sessions robust

- Enable `sessionResumption`
- Persist latest resumable handle from `sessionResumptionUpdate.newHandle`
- Reconnect with `sessionResumption.handle`
- Handle `goAway.timeLeft` proactively

### Context window compression

Enable `contextWindowCompression` with sliding-window config for long sessions. This prevents abrupt termination due to context growth.

---

## Ephemeral Tokens (Browser Direct)

### Why

Ephemeral tokens reduce risk versus embedding long-lived API keys client-side.

### Lifecycle

1. Backend authenticates caller
2. Backend creates ephemeral token (`uses`, `expireTime`, `newSessionExpireTime`)
3. Browser uses token as `access_token` (or `Authorization: Token ...`)
4. Browser opens constrained Live WebSocket

### Practical defaults

- Keep expiration short
- `uses: 1` is usually fine (session resumption does not count as additional use)
- Optionally constrain model/setup fields server-side via token constraints
- If `uses` is omitted, default is `1`
- If token windows are omitted, defaults are ~1 minute for starting new sessions and ~30 minutes message lifetime

---

## Model Notes: `gemini-3.1-flash-live-preview`

Current high-impact behavior:

- Input token limit: 131,072
- Output token limit: 65,536
- Supports Live API, search grounding, function calling, audio generation, thinking
- Native audio output models support `AUDIO` response modality; use output transcription for text UX
- Does **not** support structured outputs / URL context / code execution in Live mode
- Migration changes from 2.5:
  - `thinkingLevel` replaces `thinkingBudget`
  - server events can contain multiple parts
  - `clientContent` behavior changed for ongoing turns
  - default `turnCoverage` changed
  - async function-calling is not supported for 3.1 Live (tool loop is sequential)

---

## Next.js 16 Integration Pattern (Recommended)

For this repo style:

1. Add a backend endpoint/use case to provision ephemeral token (if browser-direct)
2. Keep realtime orchestration logic in a dedicated service/use-case, not in UI components
3. Use existing project patterns for:
   - input validation with Zod at boundaries
   - background/non-urgent work separation
   - explicit error mapping for API responses

If a page introduces live streaming UI, include clear loading/connecting/error states and interruption-safe audio UX.

---

## Troubleshooting Checklist

- No response after connect:
  - Did you send `setup` first?
  - Did you wait for `setupComplete`?
- Random cut-offs:
  - Are you handling `goAway` and reconnecting with session resumption?
  - Are you rotating/renewing around server reset windows (~10 min) with latest resumption handle?
- Users talk over model and audio overlaps:
  - On `interrupted`, clear playback queue instantly.
- Missing transcripts/audio chunks:
  - Are you iterating all parts in each server event?
- Browser-direct auth issues:
  - Using constrained endpoint + `access_token` and short-lived token?
- Excessive latency:
  - Audio chunk size too large; send ~20–40ms chunks.
- Session expires too quickly:
  - Enable context compression + resumption.
  - Confirm token `expireTime` and `newSessionExpireTime` are long enough for your interaction flow.

---

## References

- Live API overview: https://ai.google.dev/gemini-api/docs/live-api
- Capabilities: https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Tools: https://ai.google.dev/gemini-api/docs/live-api/tools
- Session management: https://ai.google.dev/gemini-api/docs/live-api/session-management
- Ephemeral tokens: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- Best practices: https://ai.google.dev/gemini-api/docs/live-api/best-practices
- WebSocket API reference: https://ai.google.dev/api/live
- Model reference: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview
- Official examples: https://github.com/google-gemini/gemini-live-api-examples
