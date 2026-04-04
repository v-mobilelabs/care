---
name: gemini-live-api
description: "**GEMINI LIVE API SKILL** — Real-time Gemini Live API implementation patterns for this Next.js 16 + React 19 + TypeScript project. USE FOR: voice/video streaming architecture; Live API WebSocket sessions; setup/realtimeInput/clientContent/toolResponse message design; interruption handling; VAD tuning; session resumption; context window compression; GoAway handling; ephemeral token security for browser-direct connections; model migration caveats for gemini-3.1-flash-live-preview. DO NOT USE FOR: Firestore CRUD/domain modeling (use data-layer skill); Mantine component styling (use frontend skill); generic non-realtime chat flows (use ai-sdk skill)."
---

# Gemini Live API — Realtime Voice/Video Patterns

_Last reviewed: 2026-03-30 (Gemini Live docs/API reference/best practices + @google/genai SDK migration)_

## Golden Rules

1. **Use `@google/genai` SDK** — always use `ai.live.connect()` from the official SDK instead of raw WebSocket connections.
2. **Prefer server-to-server for protected backends**; use browser-direct with SDK + **ephemeral tokens** for lowest latency.
3. **SDK handles setup automatically** — pass `systemInstruction`, `speechConfig`, etc. in `LiveConnectConfig`; wait for `setupComplete` in `onmessage` callback.
4. **Use `session.sendRealtimeInput()` for ongoing conversation** (audio/video/text). For `gemini-3.1-flash-live-preview`, `sendClientContent` is mainly for initial seeded history.
5. **Treat server events as multi-part** — `LiveServerMessage.serverContent.modelTurn.parts` can contain multiple parts (audio + transcript). Iterate all parts.
6. **Implement interruption-safe playback** — if `serverContent.interrupted === true`, stop and clear queued audio immediately.
7. **Plan for disconnects by default** — handle `goAway`, `sessionResumptionUpdate`, and reconnect with resumption handle.
8. **Enable context window compression** — audio tokens accumulate ~25/sec; configure `contextWindowCompression` with `triggerTokens` and `slidingWindow.targetTokens`.
9. **Keep audio format contract strict** — input: raw PCM 16-bit little-endian (`audio/pcm;rate=16000`), output: raw PCM 24kHz.
10. **Tool calls use `session.sendToolResponse()`** — execute locally, then send typed `functionResponses` back.

---

## Best Practices at a Glance

### System Instructions

- **Separate agent personas** — one distinct set of instructions per agent
- **Structure clearly**: persona → conversational rules → guardrails
- **Persona detail**: name, role, characteristics (accent/language preference if needed)
- **Conversational rules**: delineate one-time setup steps (gathering user info) vs. ongoing loops
- **Tool flow clarity**: state tool invocation order in distinct sentences with conditions
- **Guardrails**: list what the agent should NOT do; use "unmistakably" for precision

### Tool Definitions

- **Be specific about conditions** — each tool must state when it should (and shouldn't) be invoked
- Example: "Invoke `get_client_profile` _only after_ user has confirmed their account ID"
- Use clear, detailed descriptions with invocation conditions

### Prompts & Prompting

- **Single function per task** — model performs best on clear, single-purpose requests
- **Avoid lengthy multi-page prompts** — use prompt chaining instead
- **Provide examples** — show what should and shouldn't happen
- **Startup behavior** — include initial greeting or prompt to start the conversation
- **Personalization** — seed user context (name, account info, location, etc.) in system instruction for customized greetings
- **Provide starting commands and information** (critical): Live API expects user input to respond. To have the agent initiate, include "greet the user" in SI **and** embed user details in SI for natural personalization

### Language Specification

- For non-English output, set `language_code` in API request to match expected language
- Add to system instruction: `RESPOND IN {LANGUAGE}. YOU MUST RESPOND UNMISTAKABLY IN {LANGUAGE}.`

### Audio Streaming

- **Chunk size**: send modest chunks (20–40ms) to reduce latency
- **Buffering**: do not buffer input significant amounts (e.g., 1 second); minimize wait
- **Resampling**: client mic input at 44.1kHz or 48kHz → resample to 16kHz before send
- **Interruption**: `interrupted: true` in server event → immediately clear output audio queue

### Session Reliability

- **Enable context compression** — audio tokens accumulate ~25 per second; without compression, session limits are 15min (audio) or 2min (audio+video)
- **Implement resumption** — save resumption token from `SessionResumptionUpdate`, reconnect with it
- **Handle GoAway** — server sends this before drops; use `timeLeft` to gracefully close or reconnect
- **Monitor generationComplete** — know when model finishes so UI/flow can advance

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

### B) Client-to-server (browser direct to Gemini via SDK)

Use when:

- Lowest latency is critical
- You want direct media path to Gemini
- You can provision **ephemeral token** securely from backend

Pattern:

1. Browser authenticates to your backend
2. Backend creates short-lived ephemeral token via `ai.authTokens.create()`
3. Browser creates `new GoogleGenAI({ apiKey: token.name, apiVersion: "v1alpha" })`
4. Browser calls `ai.live.connect({ model, callbacks, config })` — SDK auto-detects ephemeral token and uses constrained endpoint
5. Browser streams media via `session.sendRealtimeInput()` directly

Security note: never ship long-lived API keys to the browser. The SDK handles the constrained WebSocket endpoint when `apiKey` starts with `auth_tokens/`.

---

## System Instructions & Prompt Design

### Structure your system instructions

Clear, well-structured system instructions are the foundation of high-quality Live API interactions. To get the best performance, follow this order:

1. **Agent persona** (50–100 words)
   - Name, title, background, relevant expertise
   - Accent or language preference if applicable
   - Tone and communication style

2. **Conversational rules** (map the workflow)
   - Number each step in the order you expect execution
   - Distinguish **one-time** elements (e.g., "Greet user warmly. Gather user details once at the start.")
   - Distinguish **conversational loops** (e.g., "The user can discuss recommendations, pricing, returns, and they may go from topic to topic.")
   - For greetings: include user name/context in the greeting rule itself for memorability
   - Example: Step 1: Warmly greet the client and introduce yourself. Step 2: Intake (one-time). Step 3: Main discussion (loop). Step 4: Confirm and close.

3. **Tool invocation rules** (if using tools)
   - State each tool in **distinct sentences** with clear invocation conditions
   - Example: "Your first step is to gather user information. Ask the user for their name, location, and loyalty card number. Then invoke `get_user_info` with these details."
   - Be explicit about prerequisites ("invoke _only after_" not "at some point")

4. **Guardrails** (what not to do)
   - List behaviors to avoid with specific examples of "if X happens, do Y instead"
   - Use the word "unmistakably" if you need the model to be extra precise

### Example system instruction structure

```
PERSONA:
You are Laura, a career coach from Brooklyn, NY. You specialize in data-driven career advice using statistics and research. You speak only in English, regardless of user language.

CONVERSATIONAL RULES:
1. Greet the user warmly and introduce yourself.
2. Intake: Ask for full name, date of birth, and state. Call `create_profile`.
3. Main discussion: Listen to their career concern without repeating it back. Provide data-driven insights.
4. Action items: If they mention desired actions, call `add_actions_to_profile`.
5. Next steps: Call `get_next_appointment` to check for existing bookings, or `get_available_appointments` if none exist.
6. Scheduling: After user picks a time, call `schedule_appointment`.

GUARDRAILS:
- Do not be a therapist; focus on career/data insights only.
- If the user is self-critical, never reinforce negativity.
- Do not offer platitudes; provide specific, research-backed guidance.
- Keep responses short and progressive; don't recap what they said.
```

### Prompt chaining for complex flows

For workflows with many steps, avoid packing everything into a single system instruction. Instead:

- Use the main SI for persona, tone, and primary workflow
- Send targeted follow-up instructions (e.g., "Now we're in the scheduling phase...") via `clientContent` when transitioning major steps
- This keeps the model focused and reduces confusion

### Prompts that initialize conversation (Critical for agent-initiated greetings)

**Key insight**: Live API expects user input to start responding. To have the agent initiate the conversation:

1. **Embed in system instruction**: Include explicit greeting rules: "Your first action is to greet the user warmly by name and ask how you can help."
2. **Include user context in SI**: Embed user details (name, location, account info, health profile, etc.) directly in the SI so the agent knows who they're talking to
   - Example: "Your client is John, age 32, from California."
   - Better: "You are speaking with Vasanth, a 28-year-old from Puducherry, India. Greet Vasanth warmly by first name."
3. **Do NOT rely on `clientContent` synthetic prompts**: The model should greet naturally when conversation starts, not via artificial user input
4. **VAD will trigger response**: Once user speaks (detected by Voice Activity Detection), the model will greet per your SI rules

---

## SDK Session Contract (`@google/genai`)

### Connection via SDK

Use `GoogleGenAI.live.connect()` instead of raw WebSocket. The SDK handles protocol negotiation, setup messages, and typed message parsing automatically.

```ts
import {
  GoogleGenAI,
  Modality,
  type Session,
  type LiveServerMessage,
} from "@google/genai";

// For ephemeral tokens (browser-direct), apiKey is the token.name (starts with "auth_tokens/")
const ai = new GoogleGenAI({ apiKey: ephemeralToken, apiVersion: "v1alpha" });

const session: Session = await ai.live.connect({
  model: "models/gemini-3.1-flash-live-preview",
  callbacks: {
    onopen: () => {
      /* connection established */
    },
    onmessage: (message: LiveServerMessage) => {
      /* handle typed message */
    },
    onerror: (event: ErrorEvent) => {
      /* handle error */
    },
    onclose: (event: CloseEvent) => {
      /* handle close, reconnect if needed */
    },
  },
  config: {
    responseModalities: [Modality.AUDIO],
    temperature: 0.6,
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Peri" } },
    },
    systemInstruction: { parts: [{ text: "..." }] },
    contextWindowCompression: {
      triggerTokens: 104857,
      slidingWindow: { targetTokens: 52428 },
    },
    realtimeInputConfig: {
      automaticActivityDetection: { disabled: false },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: {}, // or { handle: previousHandle }
  },
});
```

### Session methods

```ts
// Send audio chunks
session.sendRealtimeInput({ audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" } });

// Send text input
session.sendRealtimeInput({ text: "Hello" });

// Signal mic off (flush VAD)
session.sendRealtimeInput({ audioStreamEnd: true });

// Send conversation history
session.sendClientContent({ turns: [...], turnComplete: true });

// Respond to tool calls
session.sendToolResponse({ functionResponses: [{ id, name, response }] });

// Close session
session.close();
```

### Server message types (`LiveServerMessage`)

The SDK callback receives a typed `LiveServerMessage` with these fields:

- `setupComplete` — session ready
- `serverContent` — model output (audio, text, transcriptions)
- `toolCall` — function call request
- `toolCallCancellation` — cancel pending tool calls
- `goAway` — server disconnecting soon
- `sessionResumptionUpdate` — new resumption handle
- `usageMetadata` — token usage

---

## Message Semantics

### `session.sendClientContent()` (history/context)

- Appended directly to conversation history in order
- Can interrupt generation
- For `gemini-3.1-flash-live-preview`, use primarily for initial seeded history
- Send `{ turnComplete: true }` before switching to ongoing `sendRealtimeInput`

### `session.sendRealtimeInput()` (ongoing conversation)

- For low-latency concurrent streams (audio, video, text)
- Cross-stream ordering is not guaranteed
- End-of-turn is derived from activity (automatic VAD or manual activity markers)
- Use `{ audioStreamEnd: true }` when mic is turned off to flush VAD
- For `gemini-3.1-flash-live-preview`, use this for ongoing text turns

### `LiveServerMessage.serverContent`

Important fields:

- `generationComplete`
- `turnComplete`
- `interrupted`
- `modelTurn` (contains `parts[]` — iterate all)
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

### Manual activity markers

If automatic VAD disabled, client must send:

- `activityStart`
- `activityEnd`

### Interruption handling (critical)

On `serverContent.interrupted === true`:

1. **Stop playback immediately** — do not let model audio continue
2. **Clear buffered audio queue** — discard any queued output chunks
3. **Cancel side-effects** — if paired with `toolCallCancellation`, abandon local tool execution
4. **Do not repeat user** — avoid echoing back what the user said while interrupting

This is essential for natural multi-turn conversation and barge-in UX.

---

## Tool Calling in Live Sessions

### Overview

Live API tool loop with SDK:

1. `onmessage` receives `LiveServerMessage` with `toolCall.functionCalls[]`
2. Execute function(s) locally
3. Call `session.sendToolResponse({ functionResponses: [{ id, name, response }] })`

### Tool definition best practices

- **Name and description**: clearly name each tool (e.g., `get_user_profile`, `submit_order`)
- **Invocation conditions** (critical): explicitly state in the description when a tool should be called
  - Example: "Invoke this tool _only after_ the user has provided name, email, AND confirmed their intent"
  - Example: "Invoke _only if_ the user explicitly asks for a refund; do not assume"
- **Parameters**: define all required and optional fields with clear types and descriptions
- **Idempotence**: design tools to be idempotent where possible (important for retry/cancellation safety)

### Execution guidelines

- Return structured JSON objects for success and error cases
- Catch function errors and return them in response payload (do not throw)
- Keep return payload concise — model needs to process it
- If tool is cancelled mid-execution, abandon it gracefully

### Model-specific behavior

- `gemini-3.1-flash-live-preview`: function calling is **synchronous** (conversation pauses until tool response received)

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

## Ephemeral Tokens (Browser Direct via SDK)

### Why

Ephemeral tokens reduce risk versus embedding long-lived API keys client-side.

### Backend token creation

Use `@google/genai` SDK on the server:

```ts
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: serverApiKey, apiVersion: "v1alpha" });

const token = await ai.authTokens.create({
  config: {
    expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
    liveConnectConstraints: {
      model: "gemini-3.1-flash-live-preview",
      config: {
        temperature: 0.6,
        responseModalities: [Modality.AUDIO],
        sessionResumption: {},
        contextWindowCompression: { slidingWindow: {} },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: { disabled: false },
        },
      },
    },
  },
});

// Return token.name to the browser (starts with "auth_tokens/")
```

### Browser SDK connection with ephemeral token

```ts
// Browser receives token.name from backend
const ai = new GoogleGenAI({ apiKey: token.name, apiVersion: "v1alpha" });
const session = await ai.live.connect({ model, callbacks, config });
// SDK auto-detects "auth_tokens/" prefix → uses constrained BidiGenerateContent endpoint
```

### Practical defaults

- Keep expiration short (30 min session, 60 sec new session window)
- `uses: 1` is usually fine (session resumption does not count as additional use)
- Constrain model/config server-side via `liveConnectConstraints`
- The SDK automatically switches to the constrained endpoint when `apiKey` starts with `auth_tokens/`

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

## Next.js 16 Integration Pattern (This Repo)

For this repo's browser-direct architecture:

1. **Token endpoint** (`src/app/api/live/token/route.ts`): Creates ephemeral token via `GeminiLiveTokenService` → returns `{ accessToken, model }`
2. **System instruction** (`src/data/live/service/gemini-live-system-instruction.service.ts`): Builds personalized SI following Career Coach bold-Markdown structure (`**PERSONA:**` → `**CONVERSATIONAL RULES:**` → `**GENERAL GUIDELINES:**` → `**GUARDRAILS:**`)
3. **Live component** (`src/ui/ai/components/gemini-live-standalone.tsx`): Uses `@google/genai` SDK's `ai.live.connect()` with ephemeral token + typed `LiveServerMessage` callbacks
4. **Audio processing**: PCM AudioWorklet → resample to 16kHz → `session.sendRealtimeInput({ audio: { data, mimeType } })`

### Key patterns

```ts
// Token API returns the ephemeral token name
const tokenPayload = await fetch("/api/live/token", { method: "POST", ... });
const { accessToken, model } = await tokenPayload.json();

// SDK auto-detects ephemeral token → uses constrained endpoint
const ai = new GoogleGenAI({ apiKey: accessToken, apiVersion: "v1alpha" });
const session = await ai.live.connect({
  model: `models/${model}`,
  callbacks: { onopen, onmessage, onerror, onclose },
  config: {
    responseModalities: [Modality.AUDIO],
    temperature: 0.6,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Peri" } } },
    systemInstruction: { parts: [{ text: builtInstruction }] },
    contextWindowCompression: { triggerTokens: 104857, slidingWindow: { targetTokens: 52428 } },
    realtimeInputConfig: { automaticActivityDetection: { disabled: false } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: {},
  },
});
```

Include clear loading/connecting/error states and interruption-safe audio UX in live streaming pages.

---

## Troubleshooting Checklist

- No response after connect:
  - Did `onmessage` receive `setupComplete`? (SDK sends setup automatically)
  - Is your ephemeral token valid and not expired?
- Random cut-offs:
  - Are you handling `goAway` and reconnecting with session resumption?
  - Are you rotating/renewing around server reset windows (~10 min)?
- Users talk over model and audio overlaps:
  - On `serverContent.interrupted`, clear playback queue instantly.
- Missing transcripts/audio chunks:
  - Are you iterating all parts in `serverContent.modelTurn.parts`?
- Browser-direct auth issues:
  - Using `new GoogleGenAI({ apiKey: token.name, apiVersion: "v1alpha" })`?
  - Token must start with `auth_tokens/` for SDK auto-detection.
- Excessive latency:
  - Audio chunk size too large; send ~20–40ms chunks via `sendRealtimeInput`.
- Session expires too quickly:
  - Enable `contextWindowCompression` with explicit `triggerTokens` + `targetTokens`.
  - Enable `sessionResumption`.
- Model doesn't personalize (says "I don't have access to personal info"):
  - Patient identity must be embedded as natural language in the `**PERSONA:**` section, NOT as a separate labeled data block.
  - Use pattern: "Your current patient is Vasanth Jagadeesan, a 28-year-old male from Puducherry, India."

---

## Example: Career Coach Agent

### Full system instruction

This example combines persona, conversational rules, tool flow, and guardrails for a career coach agent. It demonstrates best practices for clarity and user experience:

```
**PERSONA:**
You are Laura, a career coach from Brooklyn, NY. You specialize in providing
data-driven advice to give your clients a fresh perspective on career questions.
Your special strength is quantitative insights rooted in statistics, research, and psychology.
You speak only in English, no matter what language a client speaks to you in.

**CONVERSATIONAL RULES:**

1. **Introduce yourself:** Warmly greet the client and briefly explain your approach.

2. **Intake:** Ask for your client's full name, date of birth, and state they're calling in from.
   Call `create_client_profile` to create a new patient profile. Do this only once at the start.

3. **Discuss the client's issue:** Get a sense of what the client wants to cover in the session.
   DO NOT repeat what the client is saying back to them in your response. Don't ask more than a few questions here.

4. **Reframe the client's issue with real data:** NO PLATITUDES. Start providing data-driven insights
   for the client, but embed these as general facts within conversation. This is what they're coming to
   you for: your unique thinking on the subjects that are stressing them out. Show them a new way of
   thinking about something. Let this step go on for as long as the client wants. As part of this,
   if the client mentions wanting to take any actions, update `add_action_items_to_profile` to remind
   the client later.

5. **Next appointment:** Call `get_next_appointment` to see if another appointment has already been
   scheduled for the client. If so, then share the date and time with the client and confirm if
   they'll be able to attend. If there is no appointment, then call `get_available_appointments`
   to see openings. Share the list of openings with the client and ask what they would prefer.
   Save their preference with `schedule_appointment`. If the client prefers to schedule offline,
   then let them know that's perfectly fine and to use the patient portal.

**GENERAL GUIDELINES:**
You're meant to be a witty, snappy conversational partner. Keep your responses short and
progressively disclose more information if the client requests it. Don't repeat back what the
client says back to them. Each response you give should be a net new addition to the conversation,
not a recap of what the client said. Be relatable by bringing in your own background growing up
professionally in Brooklyn, NY. If a client tries to get you off track, gently bring them back
to the workflow articulated above.

**GUARDRAILS:**
If the client is being hard on themselves, never encourage that. Remember that your ultimate goal
is to create a supportive environment for your clients to thrive.
```

### Tool definitions

Each tool definition includes a clear description and invocation condition to guide the model:

```json
[
  {
    "name": "create_client_profile",
    "description": "Creates a new client profile with their personal details. Returns a unique client ID. \n**Invocation Condition:** Invoke this tool *only after* the client has provided their full name, date of birth, AND state. This should only be called once at the beginning of the 'Intake' step.",
    "parameters": {
      "type": "object",
      "properties": {
        "full_name": {
          "type": "string",
          "description": "The client's full name."
        },
        "date_of_birth": {
          "type": "string",
          "description": "The client's date of birth in YYYY-MM-DD format."
        },
        "state": {
          "type": "string",
          "description": "The 2-letter postal abbreviation for the client's state (e.g., 'NY', 'CA')."
        }
      },
      "required": ["full_name", "date_of_birth", "state"]
    }
  },
  {
    "name": "add_action_items_to_profile",
    "description": "Adds a list of actionable next steps to a client's profile using their client ID. \n**Invocation Condition:** Invoke this tool *only after* a list of actionable next steps has been discussed and agreed upon with the client during the main discussion phase. Requires the `client_id` obtained from the start of the session.",
    "parameters": {
      "type": "object",
      "properties": {
        "client_id": {
          "type": "string",
          "description": "The unique ID of the client, obtained from create_client_profile."
        },
        "action_items": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "A list of action items for the client (e.g., ['Update resume', 'Research three companies'])."
        }
      },
      "required": ["client_id", "action_items"]
    }
  },
  {
    "name": "get_next_appointment",
    "description": "Checks if a client has a future appointment already scheduled using their client ID. Returns the appointment details or null. \n**Invocation Condition:** Invoke this tool at the *start* of the 'Next Appointment' workflow step, immediately after the main discussion phase is complete. This is used to check if an appointment *already exists*.",
    "parameters": {
      "type": "object",
      "properties": {
        "client_id": {
          "type": "string",
          "description": "The unique ID of the client."
        }
      },
      "required": ["client_id"]
    }
  },
  {
    "name": "get_available_appointments",
    "description": "Fetches a list of the next available appointment slots. \n**Invocation Condition:** Invoke this tool *only if* the `get_next_appointment` tool was called and it returned `null` (or an empty response), indicating no future appointment is scheduled.",
    "parameters": {
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "schedule_appointment",
    "description": "Books a new appointment for a client at a specific date and time. \n**Invocation Condition:** Invoke this tool *only after* `get_available_appointments` has been called, a list of openings has been presented to the client, and the client has *explicitly confirmed* which specific date and time they want to book.",
    "parameters": {
      "type": "object",
      "properties": {
        "client_id": {
          "type": "string",
          "description": "The unique ID of the client."
        },
        "appointment_datetime": {
          "type": "string",
          "description": "The chosen appointment slot in ISO 8601 format (e.g., '2025-10-30T14:30:00')."
        }
      },
      "required": ["client_id", "appointment_datetime"]
    }
  }
]
```

### Key takeaways

1. **Invocation conditions are explicit** — each tool states when it should and shouldn't be called
2. **Workflow is mapped step-by-step** — the SI defines the conversation flow clearly
3. **Persona and tone are detailed** — the model knows it's witty, data-driven, and empathetic
4. **Guardrails prevent common mistakes** — don't recap, don't offer platitudes, stay in lane

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
- Official examples (GitHub): https://github.com/google-gemini/gemini-live-api-examples
