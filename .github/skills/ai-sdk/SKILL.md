---
name: ai-sdk
description: "**AI SDK SKILL** — Vercel AI SDK v6 best practices, agent architecture, middleware, tools, streaming, structured output, and client-side chat integration for this Next.js 16 + React 19 + Google Gemini project. USE FOR: creating new agents; defining tools; adding middleware; structured extraction; streaming chat APIs; client-side useChat patterns; context caching; gateway routing; tool UI rendering; credit gating; RAG integration; thinking/reasoning mode; message persistence. DO NOT USE FOR: Firestore data access patterns (use data-layer skill); Mantine UI styling (use frontend skill); authentication flows."
---

# AI SDK — Vercel AI SDK v6 Best Practices

## Golden Rules

1. **Streaming over generating** — always prefer `streamText` / `ToolLoopAgent.stream()` for interactive chat. Reserve `generateText` for batch/background tasks.
2. **`createAgent()` factory** — every specialist agent is built via the functional `createAgent(config)` factory in `src/data/shared/service/agents/base/agent.ts`. Never instantiate `ToolLoopAgent` directly from API routes.
3. **Middleware composition** — credit gating, RAG, memory, and cache are all middleware. Add new cross-cutting concerns as middleware, not inline logic.
4. **Tools are per-request** — `buildTools(options)` creates fresh tool closures bound to `userId`, `profileId`, `sessionId`. Never share tool state across requests.
5. **Always consume the stream** — `streamText` uses backpressure; unconsumed streams hang. Always `return result.toUIMessageStreamResponse()`.
6. **Schema `.describe()`** — add `.describe("...")` to every Zod schema property in tool inputs and structured outputs. This dramatically improves model accuracy.
7. **`after()` for persistence** — never `await` Firestore writes in the streaming response path. Use Next.js `after()` for background persistence.
8. **UseCase is the entry point** — API routes call use cases, which call agent `stream()`. Never call agents directly from route handlers.

---

## Architecture Overview

```
Client (useChat) → POST /api/chat
  ↓
PrepareChatUseCase (validate, gateway routing)
  ↓
Gateway Agent (keyword → cache → default → LLM routing)
  ↓ selects
Specialist Agent (clinical | dietPlanner | prescription | labReport | patient)
  ↓ agent.stream()
createAgent().stream() → builds middleware → ToolLoopAgent
  ↓
Middleware Chain: guardrail → credit → memory → RAG → cachedContent → toolInputExamples
  ↓
ToolLoopAgent (multi-step tool loop with smoothStream)
  ↓
createUIMessageStream (data-progress + agent stream merge) → client
  ↓ after()
Background: persist messages + extract memories + bust cache tags
```

---

## Key Files

| File                                                   | Purpose                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `src/data/shared/service/agents/base/agent.ts`         | `createAgent()` factory — builds agents with middleware chain       |
| `src/data/shared/service/agents/gateway/agent.ts`      | Gateway routing — 4-tier decision (keyword → cache → default → LLM) |
| `src/data/shared/service/agents/clinical/agent.ts`     | Clinical reasoning agent                                            |
| `src/data/shared/service/agents/diet-planner/agent.ts` | 7-day meal plan agent                                               |
| `src/data/shared/service/agents/prescription/agent.ts` | Prescription writing agent                                          |
| `src/data/shared/service/agents/lab-report/agent.ts`   | Lab report analysis agent                                           |
| `src/data/shared/service/agents/patient/agent.ts`      | Patient profile/medication retrieval                                |
| `src/data/shared/service/middleware/`                  | All middleware: guardrail, credit, RAG, memory, cached-content      |
| `src/data/shared/service/ai.service.ts`                | AI service — model access, extractObject, extractChoice             |
| `src/data/shared/service/context-cache.service.ts`     | Google Gemini context caching                                       |
| `src/app/api/chat/route.ts`                            | Chat API route — streaming response + background persistence        |
| `src/ui/ai/hooks/use-messages.ts`                      | Client message state, DB hydration, optimistic sync, pagination     |
| `src/ui/ai/messages/messages.tsx`                      | Chat thread renderer                                                |
| `src/ui/ai/tools/tool-part-renderer.tsx`               | Tool UI dispatcher (questions, approvals, results)                  |
| `src/data/sessions/use-cases/prepare-chat.use-case.ts` | PrepareChatUseCase — validate, route, sanitize, build options       |
| `docs/vercel-ai-sdk.md`                                | Full AI SDK v6 reference documentation                              |

### Ecosystem Libraries

| Library             | Package                     | Purpose                                                       | Docs                     |
| ------------------- | --------------------------- | ------------------------------------------------------------- | ------------------------ |
| **Streamdown**      | `streamdown`                | Streaming Markdown renderer — animations, carets, code, math  | https://streamdown.ai/   |
| **Chat SDK**        | `chat`                      | Multi-platform chat bots (Slack, Teams, Discord, etc.)        | https://chat-sdk.dev/    |
| **Workflow DevKit** | `workflow` + `@workflow/ai` | Durable AI agents — retries, resumable streams, human-in-loop | https://useworkflow.dev/ |

---

## 1. Creating a New Agent

### Agent Config

Use `createAgent()` from `src/data/shared/service/agents/base/agent.ts`:

```ts
import { createAgent } from "@/data/shared/service/agents/base/agent";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";

export const myAgent = createAgent({
  id: "myAgent",
  buildSystemPrompt: () => `You are a specialist in ...`,
  buildTools: (options: AgentCallOptions) => ({
    myTool: createMyTool(options.userId, options.profileId),
  }),
  // Optional overrides:
  buildDynamicContext: (options) =>
    options.hasAttachment ? "User attached a file." : "",
  useThinking: true, // default: true — enables Gemini thinking
  maxSteps: 10, // default: 10 — max tool loop iterations
  // model / fastModel override only if needed
});
```

> **Note**: `createAgent()` automatically injects a `memory` tool into every agent's toolset. You do not need to add it to `buildTools()`. The memory tool allows the model to save/recall/delete cross-session patient facts (medical, preference, lifestyle, allergy, summary).

```ts
// Automatic injection inside createAgent():
const tools = {
  ...buildTools(options),
  memory: createMemoryTool(
    options.userId,
    options.profileId,
    options.sessionId,
  ),
};
```

### AgentCallOptions (per-request context)

```ts
interface AgentCallOptions {
  userId: string;
  profileId: string;
  dependentId?: string;
  userQuery: string; // latest user message text
  sessionId: string;
  hasAttachment?: boolean;
  queryEmbedding?: number[]; // pre-computed in PrepareChatUseCase when needsRag=true
  thinkingLevel: "low" | "medium" | "high"; // set by gateway
  needsRag: boolean; // set by gateway
}
```

### Register in Gateway

After creating the agent, add it to the AGENTS map and update gateway routing:

1. Add to the agents map in the gateway
2. Add keyword patterns for deterministic routing (if applicable)
3. Add the agent name to the LLM routing prompt options (for ambiguous queries)
4. Update `inferNeedsRag()` RECORD_HINTS if the agent deals with patient data

### Agent Conventions

| Setting       | Default                  | Override when                                                      |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| `useThinking` | `true`                   | Simple retrieval agents (e.g., patient) → `false`                  |
| `maxSteps`    | `10`                     | Multi-tool agents (diet planner: 15) or simple agents (patient: 5) |
| `model`       | `gemini-3.1-pro-preview` | Only if a different model tier is needed                           |
| `fastModel`   | `gemini-3-flash-preview` | Used when `thinkingLevel === "low"`                                |

---

## 2. Defining Tools

### Server-Side Tool (with execute)

```ts
import { tool } from "ai";
import { z } from "zod";

export function createMyTool(userId: string, profileId: string) {
  return tool({
    description: "What this tool does — be specific for model accuracy",
    inputSchema: z.object({
      query: z.string().describe("Search query for patient records"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default: 5)"),
    }),
    execute: async ({ query, limit = 5 }) => {
      // Tool has closure over userId, profileId
      const results = await someService.search(profileId, query, limit);
      return { results, count: results.length };
    },
  });
}
```

### Client-Side Tool (no execute — rendered in UI)

```ts
export const askQuestion = tool({
  description: "Ask the user a clinical follow-up question",
  inputSchema: z.object({
    question: z.string().describe("A focused clinical follow-up question"),
    type: z
      .enum(["yes_no", "single_choice", "multi_choice", "scale", "free_text"])
      .describe("The response format"),
    options: z
      .array(z.string())
      .optional()
      .describe("Answer choices (required for single_choice/multi_choice)"),
  }),
  // No execute — handled on client via addToolOutput
});
```

### Tool with Approval Required

```ts
export const submitPrescription = tool({
  description: "Submit a prescription for patient review",
  inputSchema: PrescriptionSchema,
  needsApproval: true, // renders approve/decline UI before execution
  execute: async (prescription) => {
    await prescriptionService.save(prescription);
    return { status: "saved", id: prescription.id };
  },
});
```

### Per-Request Tool Closures (state accumulation)

For tools that collect data across multiple steps in one request:

```ts
buildTools: (options: AgentCallOptions) => {
  const collectedDays: DietDay[] = [];  // per-request mutable state

  return {
    submitDailyPlan: tool({
      description: "Submit one day of the 7-day meal plan",
      inputSchema: DailyPlanSchema,
      execute: async (dayPlan) => {
        collectedDays.push(dayPlan);
        if (collectedDays.length === 7) {
          await savePlan(options.userId, collectedDays);
          return { status: "complete", totalDays: 7 };
        }
        return { status: "accepted", daysRemaining: 7 - collectedDays.length };
      },
    }),
  };
},
```

### Tool Best Practices

- **Descriptive names** — tool name becomes `tool-{name}` part type in UI
- **Rich descriptions** — the model reads `description` and `.describe()` to decide when/how to call
- **Return structured data** — always return an object (not a string) so the model can reason about results
- **Minimal parameters** — only include what the model needs to provide; derive the rest from closures
- **No side effects in input validation** — Zod schemas handle validation; keep `execute` focused on logic

---

## 3. Language Model Middleware

### Middleware Structure

```ts
import type { LanguageModelMiddleware } from "ai";

const myMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",

  // Modify params before model call (both generate + stream)
  transformParams: async ({ params }) => {
    return { ...params /* modifications */ };
  },

  // Wrap non-streaming calls
  wrapGenerate: async ({ doGenerate, params }) => {
    // pre-processing
    const result = await doGenerate();
    // post-processing
    return result;
  },

  // Wrap streaming calls
  wrapStream: async ({ doStream, params }) => {
    // pre-processing
    const { stream, ...rest } = await doStream();
    // optionally transform stream
    return { stream, ...rest };
  },
};
```

### Existing Middleware Chain (applied in order)

| Middleware                       | File                                      | Purpose                                                                  |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `guardrailMiddleware`            | `middleware/guardrail.middleware.ts`      | Block harmful / injected / off-topic input (keyword + LLM, no credit)    |
| `creditMiddleware`               | `middleware/credit.middleware.ts`         | Consume 1 credit per LLM call; throw `CreditsExhaustedError` if depleted |
| `memoryMiddleware`               | `middleware/memory.middleware.ts`         | Inject cross-session patient memories into prompt                        |
| `ragMiddleware`                  | `middleware/rag.middleware.ts`            | Fetch medical records (KNN + reranking) + clinical guidelines            |
| `cachedContentMiddleware`        | `middleware/cached-content.middleware.ts` | Strip system/tools when Google cache is active                           |
| `addToolInputExamplesMiddleware` | AI SDK built-in                           | Inject tool input examples into descriptions                             |
| `devToolsMiddleware`             | `@ai-sdk/devtools` (dev only)             | AI SDK DevTools integration — only included in development               |

**Order matters**: guardrail runs first so blocked messages never consume a credit. Credit runs before RAG so depleted users never trigger expensive vector search.

### Composing Middleware

```ts
import { wrapLanguageModel } from "ai";

const wrappedModel = wrapLanguageModel({
  model: baseModel,
  middleware: [creditMiddleware, memoryMiddleware, ragMiddleware],
  // Applied in array order — first middleware wraps outermost
});
```

### Key Patterns

**Prevent double-execution** (credit middleware pattern):

```ts
wrapStream: async ({ doStream, params }) => {
  // Check flag to prevent double-charging in multi-step loops
  if (params.providerOptions?.__creditConsumed) return doStream();

  await consumeCredit(userId);
  return doStream();
},
```

**Conditional execution** (RAG middleware pattern):

```ts
transformParams: async ({ params }) => {
  if (!needsRag) return params;  // skip expensive fetch

  const [records, guidelines] = await Promise.allSettled([
    withTimeout(ragService.search(query), 10_000),
    withTimeout(guidelineService.search(query), 10_000),
  ]);

  // Graceful degradation — continue even if fetch fails
  return injectContext(params, records, guidelines);
},
```

**Cache-aware injection** (inject as system message OR synthetic turns):

```ts
// When no context cache → inject as system message
// When context cache active → inject as synthetic user/assistant turns
// (Google API rejects system_instruction alongside cachedContent)
const isCacheActive = !!params.providerOptions?.google?.cachedContent;

if (isCacheActive) {
  return addAsSyntheticTurns(params, context);
} else {
  return addAsSystemMessage(params, context);
}
```

---

## 4. Structured Output & Extraction

### `Output.object()` with Zod

```ts
import { generateText, Output } from "ai";
import { z } from "zod";

const { output } = await generateText({
  model,
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(["positive", "neutral", "negative"]),
      summary: z.string().describe("One-sentence summary"),
      keyPoints: z.array(z.string()),
    }),
  }),
  prompt: "Analyze this feedback...",
});
// output is fully typed: { sentiment, summary, keyPoints }
```

### `Output.choice()` for Classification

```ts
import { Output } from "ai";

const { output } = await generateText({
  model,
  output: Output.choice({
    options: [
      "clinical",
      "dietPlanner",
      "prescription",
      "labReport",
      "patient",
    ],
  }),
  prompt: routingPrompt,
});
// output is typed as the union of options
```

### AI Service Helpers

```ts
import { aiService } from "@/data/shared/service";

// Structured extraction (credit-gated)
const result = await aiService.extractObject(MySchema, messages, {
  userId,
  useLite: true, // use fast-lite model
  skipCredit: true, // don't consume credit (e.g., for routing)
});

// Classification
const agent = await aiService.extractChoice(
  ["clinical", "dietPlanner", "prescription"],
  messages,
  { userId, useLite: true, skipCredit: true },
);
```

### Output Types

| Output                       | Use case                 | Notes                                                |
| ---------------------------- | ------------------------ | ---------------------------------------------------- |
| `Output.object({ schema })`  | Structured extraction    | Zod validates response; `.describe()` on fields      |
| `Output.array({ element })`  | Lists of typed objects   | Use `elementStream` for element-by-element streaming |
| `Output.choice({ options })` | Classification / routing | Returns one of the fixed string options              |
| `Output.json()`              | Unstructured JSON        | No schema validation                                 |
| `Output.text()`              | Plain text (default)     | No transformation                                    |

---

## 5. Chat API Route Pattern

### Standard Route Structure

The actual route uses `createUIMessageStream` + `writer.merge` to inject custom `data-progress` parts (loading hints) before merging the agent stream. This is more powerful than the simpler `createAgentUIStreamResponse` — it allows writing custom stream parts first.

```ts
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  createAgentUIStream,
  consumeStream,
} from "ai";
import { after } from "next/server";

export const maxDuration = 180; // serverless timeout — set high for tool chains

export const POST = WithContext(async ({ user, dependentId, profileId, req }) => {
  const body = await req.json();

  // 1. PrepareChatUseCase — validate, route, sanitize, build options
  const { agent, sanitizedMessages, messages, options, agentType, loadingHints, sessionId, ctx } =
    await new PrepareChatUseCase().execute({ userId: user.uid, profileId, dependentId, body });

  // 2. Capture response for persistence
  let persistPayload: { responseParts: unknown[] } | null = null;
  let totalInputTokens = 0, totalOutputTokens = 0;

  // 3. Background persistence via after()
  after(async () => {
    await new AddMessageUseCase().execute({ userId: user.uid, profileId, sessionId, role: "user", content: ... });
    if (!persistPayload) return;  // client disconnected before AI responded
    await new AddMessageUseCase().execute({ userId: user.uid, profileId, sessionId, role: "assistant", content: JSON.stringify(persistPayload.responseParts), usage });
    revalidateTag(CacheTags.usage(user.uid), "seconds");
    await new SetSessionAgentUseCase().execute({ userId: user.uid, profileId, sessionId, agentType });
    await extractAndSaveMemories({ userId: user.uid, profileId, sessionId, ... });
  });

  // 4. Compose stream — inject data-progress parts, then merge agent stream
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Send loading hints BEFORE agent starts streaming
      writer.write({
        type: "data-progress",
        data: { stage: "Preparing...", loadingHints },
        transient: true, // official pattern for ephemeral UI notifications
      });

      const agentStream = await createAgentUIStream({
        agent,
        uiMessages: sanitizedMessages,
        options,
        abortSignal: req.signal,
        originalMessages: messages,
        onStepFinish: (step) => { totalInputTokens += step.usage?.inputTokens ?? 0; ... },
        onFinish: ({ responseMessage }) => { persistPayload = { responseParts: responseMessage.parts }; },
      });

      writer.merge(agentStream);
    },
    onError: (error) => {
      if (error instanceof CreditsExhaustedError) return JSON.stringify({ error: { code: error.code, message: error.toResponseMessage() } });
      if (error instanceof GuardrailError) return JSON.stringify({ error: { code: error.code, message: error.toResponseMessage() } });
      return "An error occurred while generating the response.";
    },
  });

  // 5. Return with server-side stream consumption
  return createUIMessageStreamResponse({
    stream,
    headers: { "X-Session-Id": sessionId },
    // Consume the SSE stream on the server so onFinish fires even on client disconnect
    consumeSseStream: ({ stream: sseStream }) => {
      consumeStream({ stream: sseStream, onError: (e) => console.error(e) });
    },
  });
});
```

### Key Route Patterns

| Pattern                        | Implementation                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Loading hints**              | Sent as `data-progress` with `transient: true` (not HTTP headers) — arrives before first token and stays out of history |
| **Stream composition**         | `createUIMessageStream` + `writer.merge(createAgentUIStream())`                                                         |
| **Server-side consumption**    | `consumeSseStream` + `consumeStream` ensures `onFinish` fires on client disconnect                                      |
| **Message sanitization**       | `PrepareChatUseCase` strips tool parts for tools not in the selected agent's toolset (cross-agent session continuity)   |
| **Server-managed persistence** | Client sends only the last message via `prepareSendMessagesRequest`; server loads full history from Firestore           |
| **Session agent affinity**     | `SetSessionAgentUseCase` persists agent type; reloaded on cold start for routing cache                                  |

### Error Handling

```ts
// CreditsExhaustedError → 402 response
// Caught in the API route, serialized with error code
// Client shows "out of credits" alert in input bar

// Stream errors — use onError callback
const result = streamText({
  model,
  messages,
  onError({ error }) {
    console.error("[Stream Error]", error);
  },
});
```

---

## 6. Client-Side Chat Integration

### useChat Configuration

```ts
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";

const {
  messages,
  sendMessage,
  status,
  stop,
  addToolOutput,
  addToolApprovalResponse,
} = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { sessionId },
    headers: dependentId ? { "x-dependent-id": dependentId } : {},
    // Server-managed persistence — only send the last message as a single
    // UIMessage object. Server loads full conversation history from Firestore.
    // The body key is `message` (singular) to match the PrepareChatSchema.
    prepareSendMessagesRequest({ messages, body }) {
      return {
        body: { ...body, message: messages[messages.length - 1] },
      };
    },
  }),
  // IMPORTANT: Register dataPartSchemas only for parts that should persist in
  // message.parts/history. For ephemeral notifications (progress/usage/error),
  // send them with `transient: true` from the server and handle via onData.
  onData: (part) => {
    if (part.type === "data-usage") {
      /* update live usage */ return;
    }
    if (part.type === "data-error") {
      /* show error banner */ return;
    }
    if (part.type !== "data-progress") return;
    // Update loading hints state from the data-progress stream part
    const { stage, loadingHints } = part.data;
    setLoadingHints([stage, ...loadingHints]);
  },
  messages: initialMessages,
  // Auto-submit when all client-side tool results are collected OR approval responses are given
  sendAutomaticallyWhen: (args) =>
    lastAssistantMessageIsCompleteWithToolCalls(args) ||
    lastAssistantMessageIsCompleteWithApprovalResponses(args),
});
```

### Persistence Boundaries (Official AI SDK)

- Data parts are **persistent by default** and are added to `message.parts`.
- Use `transient: true` for UI-only notifications so they are available in
  `onData` but not stored in message history.
- `step-start` is a built-in structural part for multi-step boundaries; render
  it in UI if needed, but treat it as non-business content.
- Prefer message metadata for message-level fields like token usage, model ID,
  timestamps, and latency.

References:

- https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data
- https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata
- https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message

### `data-progress` Custom Stream Part

Loading hints are sent as a custom `data-progress` part from the route (not HTTP headers). Define the schema:

```ts
// src/ui/ai/types/progress.ts
import { z } from "zod";

export const progressPartSchema = z.object({
  stage: z.string(),
  loadingHints: z.array(z.string()).optional(),
});
```

The route writes this part before starting the agent stream:

```ts
writer.write({
  type: "data-progress",
  data: { stage: "Preparing...", loadingHints },
  transient: true, // onData only; not persisted to message.parts
});
```

### Status Values

| Status        | Meaning                               |
| ------------- | ------------------------------------- |
| `"ready"`     | Idle — no active request              |
| `"submitted"` | Request sent, waiting for first token |
| `"streaming"` | Response actively streaming           |

### DB Hydration & Cache Sync

```ts
// Hydrate useChat from Firestore on mount
useEffect(() => {
  if (dbLoaded && !hasHydrated.current) {
    hasHydrated.current = true;
    setMessages(dbMessages.map(dbToUIMessage));
  }
}, [dbLoaded, dbMessages]);

// Optimistic sync when stream finishes
useEffect(() => {
  if (status === "ready" && hasHydrated.current) {
    setMessagesCache(messages.map(uiToRecord));
    invalidateSessions();
    invalidateCredits();
  }
}, [status]);
```

### Free-Text Question Routing

Free-text questions from `askQuestion` tool are answered via the input bar using `addToolOutput`, not `sendMessage`:

```ts
// When model sends askQuestion with type: "free_text"
// → set pendingFreeText = { toolCallId, question }
// → input bar shows question label + submit calls addToolOutput()
addToolOutput({ tool: "askQuestion", toolCallId, output: answer });
// → clear pendingFreeText after submission
```

For non-free-text questions (yes/no, single_choice, multi_choice, scale), answers are also submitted via `addToolOutput` from inline question card buttons — not `sendMessage`.

### Message Pagination

```ts
// Infinite query fetches newest-first from Firestore
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: chatKeys.messages(sessionId),
  queryFn: ({ pageParam }) => fetchMessages(sessionId, pageParam),
  getNextPageParam: (lastPage) => lastPage.cursor,
});

// "Load older messages" button at top of thread
// Preserve scroll position when prepending older messages
```

---

## 7. Tool UI Rendering

### ToolPartRenderer Pattern

Tool UI is dispatched centrally in `src/ui/ai/tools/tool-part-renderer.tsx`:

```tsx
message.parts.map((part) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;
    case "tool-askQuestion":
      return <QuestionCard part={part} onAnswer={onAnswer} />;
    case "tool-submitPrescription":
      return <PrescriptionCard part={part} onApproval={onApproval} />;
    case "step-start":
      return index > 0 ? <Divider /> : null;
  }
});
```

### Tool Part States

| State                | UI Treatment                              |
| -------------------- | ----------------------------------------- |
| `input-streaming`    | Loading indicator ("Preparing question…") |
| `input-available`    | Interactive card (question, form, etc.)   |
| `approval-requested` | Approve/decline buttons                   |
| `output-available`   | Read-only result display                  |
| `output-error`       | Red alert with error message              |

### Adding a New Tool Card

1. Define the tool in the agent's `buildTools()`
2. Add a `case "tool-{toolName}"` in `ToolPartRenderer`
3. Create the card component using Mantine (Paper, Group, Button, etc.)
4. Handle state transitions: `input-available` → user interaction → `addToolOutput()` or `addToolApprovalResponse()`

---

## 8. Gateway Routing

### 4-Tier Decision Strategy

```
Tier 1: Keyword match (0ms, deterministic)
  → diet/meal/nutrition → dietPlanner
  → prescription/refill → prescription
  → blood test/lab → labReport
  → profile/medication → patient

Tier 2: Session cache (0ms)
  → reuse last agent for this session (unless specialist hint detected)

Tier 3: Default to clinical (0ms)
  → if no specialist signals, route to clinical (covers most queries)

Tier 4: LLM classification (~100ms, no credit)
  → only for ambiguous specialist queries
  → uses Gemini Flash Lite via Output.choice()
```

### inferNeedsRag

Controls whether expensive KNN + Bedrock reranking runs:

```ts
function inferNeedsRag(query: string, hasAttachment?: boolean): boolean {
  if (hasAttachment) return true; // files always need RAG
  if (matchesRecordHints(query)) return true; // "my medications", "medicines i take"
  if (query.split(" ").length < 12) return false; // short queries skip RAG
  return true; // longer queries get RAG by default
}
```

**RECORD_HINTS** — keyword list that triggers RAG for short queries. When adding new patient data types, add corresponding patterns here or RAG won't fire.

### inferThinkingLevel

```ts
function inferThinkingLevel(
  query: string,
  hasAttachment?: boolean,
): ThinkingLevel {
  if (hasAttachment) return "high";
  if (hasEmergencyKeywords(query)) return "high"; // chest pain, can't breathe
  if (hasReasoningWords(query)) return "medium"; // should, why, assess
  if (query.split(" ").length < 10) return "low"; // short symptom descriptions
  return "medium";
}
```

---

## 9. Google Context Caching

### How It Works

Static system prompts + tool declarations are cached as Google `cachedContent` resources, reducing latency and token costs for repeated calls.

```ts
// In createAgent().stream():
const cacheName = await contextCacheService.getOrCreate({
  agentId,
  modelId,
  systemPrompt: staticPrompt,
  toolDeclarations,
});

// Pass to ToolLoopAgent:
const result = agent.stream({
  messages,
  providerOptions: {
    google: { cachedContent: cacheName },
  },
});
```

### Cache Rules

- **TTL**: 30 minutes, refreshed 5 minutes before expiry
- **Minimum**: ≥4,096 tokens (~2,000 words) — falls back gracefully for short prompts
- **Content**: Static system prompt + tool declarations only (NOT dynamic RAG/memory)
- **Invalidation**: Hash-based — when prompt changes, old cache is discarded

### When Cache Is Active

Google API rejects `system_instruction`, `tools`, `toolConfig` alongside `cachedContent`. The `cachedContentMiddleware` handles this:

- Static prompt → already in cache (stripped from request)
- Dynamic content (RAG, memory, guidelines) → injected as synthetic user/assistant turns
- Tool declarations → already in cache (stripped from request)

---

## 10. Thinking / Reasoning Mode

### Per-Message Thinking Level

Thinking depth is set per-message by the gateway, not globally:

```ts
providerOptions: {
  google: {
    thinkingConfig: {
      thinkingLevel: routing.thinkingLevel,  // "low" | "medium" | "high"
      includeThoughts: true,                  // stream reasoning to client
    },
  },
},
```

### Model Selection by Thinking Level

| Level      | Model                    | Use case                                    |
| ---------- | ------------------------ | ------------------------------------------- |
| `"low"`    | `gemini-3-flash-preview` | Simple retrieval, greetings                 |
| `"medium"` | `gemini-3.1-pro-preview` | Standard clinical reasoning                 |
| `"high"`   | `gemini-3.1-pro-preview` | Emergency, file analysis, complex reasoning |

### thoughtSignature

Google returns an opaque `thoughtSignature` in `providerMetadata`. The SDK round-trips it automatically to preserve reasoning context across turns. **Don't strip `providerMetadata` from messages when persisting.**

---

## 11. Multi-Provider Model Setup

```ts
import { google } from "@ai-sdk/google";

const models = {
  pro: google("gemini-3.1-pro-preview"), // deep reasoning — clinical, complex analysis
  flash: google("gemini-3-flash-preview"), // fast — simple queries, low thinking
  lite: google("gemini-2.5-flash-lite"), // ultra-fast — gateway routing (no credit)
};
```

### Model Routing

| Task                                 | Model                                | Credit                        |
| ------------------------------------ | ------------------------------------ | ----------------------------- |
| Gateway routing / classification     | lite                                 | No (`skipCredit: true`)       |
| Simple chat, low-thinking            | flash                                | Yes                           |
| Clinical reasoning, complex analysis | pro                                  | Yes                           |
| Structured extraction                | configurable via `useLite`/`useFast` | configurable via `skipCredit` |

---

## 12. Streaming Best Practices

### smoothStream for UX

All agents use `smoothStream()` for polished token output:

```ts
import { smoothStream, streamText } from "ai";

const result = streamText({
  model,
  messages,
  experimental_transform: smoothStream(),
});
```

### AbortSignal Propagation

Always forward the request's AbortSignal to cancel LLM calls when client disconnects:

```ts
const result = streamText({
  model,
  messages,
  abortSignal: req.signal,
});
```

### maxDuration for Serverless

```ts
// Complex tool chains (diet plans, multi-step analysis)
export const maxDuration = 180;

// Simple chat
export const maxDuration = 60;
```

### stepCountIs for Tool Loops

```ts
import { stepCountIs } from "ai";

// In ToolLoopAgent or streamText:
stopWhen: stepCountIs(10),  // max 10 tool iterations
```

Guidelines:

- **5** — simple retrieval agents
- **10** — standard agents (clinical, prescription, blood test)
- **15** — multi-tool agents (diet planner: 7 days × ~2 steps)

---

## 13. Message Persistence Pattern

### Write Path (via `after()`)

```ts
import { after } from "next/server";

// In API route — don't block streaming:
after(async () => {
  // Save user + assistant messages to Firestore
  await addMessageUseCase.execute({
    sessionId,
    role: "user",
    parts: userParts,
  });
  await addMessageUseCase.execute({
    sessionId,
    role: "assistant",
    parts: assistantParts,
    usage,
  });

  // Extract & save memories
  await extractAndSaveMemories(sessionId, messages);

  // Bust cache tags
  revalidateTag(CacheTags.usage(userId));
  revalidateTag(CacheTags.sessions(profileId));
});
```

### Read Path (DB → UI)

Messages stored in Firestore are converted to AI SDK UIMessage format:

```ts
// dbToUIMessage(record) — converts stored format to UIMessage
// Handles:
//   - Text parts: { type: "text", text }
//   - File parts: { type: "file", url, mediaType }
//   - Tool parts: { type: "tool-{toolName}", toolCallId, state, input, output }
//   - Legacy format normalization (old SDK → new SDK format)
```

### Optimistic Cache Sync

```ts
// On status="submitted" — cache user message immediately
// On status="ready" — cache full conversation
// Uses TanStack Query setQueryData() for instant UI update
// Also invalidates: sessions sidebar, credits balance, assessments
```

---

## 14. Credit System Integration

### Monthly Usage Collection

Credits use the `usage/{profile}` monthly collection (NOT legacy daily credits):

```ts
// Credit middleware consumes 1 credit per LLM call
// UsageService handles lazy monthly reset
// __creditConsumed flag prevents double-charging in multi-step loops
// CreditsExhaustedError(0) → caught by API route → 402 response
```

### Skip Credit for Meta-Operations

```ts
// Gateway routing — no credit consumed
aiService.extractChoice(options, messages, {
  userId,
  skipCredit: true,
  useLite: true,
});

// Structured extraction for routing — no credit
aiService.extractObject(schema, messages, { userId, skipCredit: true });
```

---

## 15. End-to-End Type Safety

### InferAgentUIMessage

```ts
import { ToolLoopAgent, InferAgentUIMessage } from "ai";

const myAgent = new ToolLoopAgent({
  model,
  tools: { askQuestion, submitPlan },
});

export type MyAgentUIMessage = InferAgentUIMessage<typeof myAgent>;
```

### Typed Tool Parts in Client

```tsx
import type { MyAgentUIMessage } from "@/agents/my-agent";

const { messages } = useChat<MyAgentUIMessage>();

// part.type is "tool-askQuestion" | "tool-submitPlan" | "text" | ...
// part.input and part.output are fully typed
```

---

## Quick Reference

| Pattern            | Import                                   | Key Option                                      |
| ------------------ | ---------------------------------------- | ----------------------------------------------- |
| Streaming chat     | `streamText`                             | `stopWhen: stepCountIs(N)`                      |
| Structured output  | `Output.object({ schema })`              | `.describe()` on fields                         |
| Classification     | `Output.choice({ options })`             | Fast routing                                    |
| Agents             | `createAgent()` → `ToolLoopAgent`        | `buildTools`, `buildSystemPrompt`               |
| Middleware         | `wrapLanguageModel`                      | `transformParams`, `wrapGenerate`, `wrapStream` |
| Client hooks       | `useChat` from `@ai-sdk/react`           | `transport`, `sendAutomaticallyWhen`            |
| Tool approval      | `tool({ needsApproval })`                | `addToolApprovalResponse`                       |
| Context cache      | `providerOptions.google.cachedContent`   | Strip system/tools via middleware               |
| Thinking mode      | `providerOptions.google.thinkingConfig`  | `thinkingLevel`, `includeThoughts`              |
| Stream smooth      | `experimental_transform`                 | `smoothStream()`                                |
| Async persist      | `after()` from `next/server`             | `onFinish` callback                             |
| Credit gating      | `creditMiddleware`                       | `__creditConsumed` flag                         |
| Message convert    | `convertToModelMessages`                 | UIMessage[] → ModelMessage[]                    |
| Markdown render    | `Streamdown` from `streamdown`           | `isAnimating`, `plugins`, `animated`            |
| Multi-platform bot | `Chat` from `chat`                       | `onNewMention`, adapters, state                 |
| Durable agent      | `DurableAgent` from `@workflow/ai/agent` | `"use workflow"`, `"use step"`, `start()`       |
| Resumable stream   | `WorkflowChatTransport`                  | `prepareReconnectToStreamRequest`, `resume`     |
| Human-in-loop      | `defineHook()` from `workflow`           | `hook.create()`, `hook.resume()`                |

---

## 16. Streamdown — Streaming Markdown Renderer

> **Docs**: https://streamdown.ai/ · **Package**: `streamdown` · **GitHub**: https://github.com/vercel/streamdown

Streamdown is a drop-in replacement for `react-markdown`, purpose-built for rendering streaming AI content. It handles incomplete Markdown during streaming, per-word animations, streaming carets, security hardening, and tree-shakeable plugins.

### Installation

```bash
pnpm add streamdown
# Optional plugins — install only what you need:
pnpm add @streamdown/code @streamdown/mermaid @streamdown/math @streamdown/cjk
```

### Tailwind CSS Configuration (v4)

Add source directives to `globals.css` so Tailwind scans Streamdown's classes:

```css
@source "../node_modules/streamdown/dist/*.js";
/* Only add plugins you've installed: */
@source "../node_modules/@streamdown/code/dist/*.js";
```

Import animation styles in layout if using the `animated` prop:

```ts
import "streamdown/styles.css";
```

### Basic Usage with AI SDK

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import "katex/dist/katex.min.css";

export default function Chat() {
  const { messages, status } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.parts.map((part, index) =>
            part.type === "text" ? (
              <Streamdown
                key={index}
                plugins={{ code, math }}
                isAnimating={
                  status === "streaming" && message.role === "assistant"
                }
              >
                {part.text}
              </Streamdown>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}
```

### Key Props

| Prop                | Type                           | Purpose                                                                    |
| ------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `children`          | `string`                       | Markdown content to render                                                 |
| `isAnimating`       | `boolean`                      | Controls streaming mode — enables caret + animation + unterminated parsing |
| `animated`          | `boolean \| AnimateOpts`       | Per-word streaming animation (`fadeIn`, `blurIn`, `slideUp`)               |
| `plugins`           | `{ code, mermaid, math, cjk }` | Tree-shakeable plugin object                                               |
| `mode`              | `"streaming" \| "static"`      | Static mode for pre-generated content (blog posts, docs)                   |
| `components`        | `Record<string, Component>`    | Override any HTML element with custom React components                     |
| `allowedTags`       | `Record<string, string[]>`     | Allow custom HTML tags (e.g., `<source>`, `<mention>`) through sanitizer   |
| `literalTagContent` | `string[]`                     | Treat children of specified tags as plain text (no Markdown parsing)       |
| `shikiTheme`        | `[string, string]`             | Light/dark theme pair for code highlighting                                |
| `controls`          | `object`                       | Toggle copy/download/fullscreen buttons on code, table, mermaid            |

### Animation Options

```tsx
<Streamdown
  animated={{
    animation: "blurIn", // "fadeIn" | "blurIn" | "slideUp" | custom
    duration: 200, // ms (default: 150)
    easing: "ease-out", // CSS timing function
    sep: "word", // "word" | "char"
  }}
  isAnimating={status === "streaming"}
>
  {markdown}
</Streamdown>
```

For fast-streaming models (Gemini Flash), use `blurIn` with ~200–300ms duration — it masks batch token arrivals better than pure opacity.

### Custom HTML Tags (for AI-generated structured output)

Useful when the AI model outputs structured tags like `<source id="123">Title</source>`:

```tsx
<Streamdown
  allowedTags={{ source: ["id"], mention: ["user_id"] }}
  literalTagContent={["mention"]}
  components={{
    source: ({ id, children }) => (
      <SourceBadge sourceId={id as string}>{children}</SourceBadge>
    ),
    mention: ({ user_id, children }) => (
      <UserMention userId={user_id as string}>{children}</UserMention>
    ),
  }}
>
  {markdown}
</Streamdown>
```

### Streaming State Hook

Custom code components can detect if their code fence is still streaming:

```tsx
import { useIsCodeFenceIncomplete } from "streamdown";

const MyCodeBlock = ({ children }) => {
  const isIncomplete = useIsCodeFenceIncomplete();
  if (isIncomplete) return <Skeleton h={96} />;
  return (
    <pre>
      <code>{children}</code>
    </pre>
  );
};
```

### Built-in Security

- `rehype-sanitize` — XSS protection, strips dangerous elements/attributes
- `rehype-harden` — URL prefix allow-lists for images and links
- Link safety modals — display full URL before navigation

### Key Differences from react-markdown

- **Unterminated block parsing** — renders incomplete Markdown during streaming
- **Per-word animation** — zero DOM overhead when animation ends
- **Built-in caret indicator** — shows content is generating
- **Shiki code highlighting** — via `@streamdown/code` plugin (lazy-loaded)
- **Security hardened** by default (sanitize + harden)

---

## 17. Chat SDK — Multi-Platform Chat Bots

> **Docs**: https://chat-sdk.dev/ · **Package**: `chat` · **GitHub**: https://github.com/vercel/chat

Chat SDK is a unified TypeScript SDK for building chat bots across Slack, Microsoft Teams, Google Chat, Discord, Telegram, GitHub, Linear, and WhatsApp from a single codebase. Event-driven, type-safe, with JSX cards and first-class AI streaming support.

### Installation

```bash
pnpm add chat
# Platform adapters:
pnpm add @chat-adapter/slack @chat-adapter/discord @chat-adapter/teams
# State adapters:
pnpm add @chat-adapter/state-redis
```

### Core Concepts

1. **Chat** — main entry point that coordinates adapters and routes events
2. **Adapters** — platform-specific implementations (webhook parsing, message formatting, API calls)
3. **State** — pluggable persistence for thread subscriptions and distributed locking

### Basic Setup

```ts
import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";

export const bot = new Chat({
  userName: "careai-bot",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createRedisState(),
});

// Respond when someone @mentions the bot
bot.onNewMention(async (thread) => {
  await thread.subscribe();
  await thread.post("Hello! I'm listening to this thread now.");
});

// Respond to follow-up messages in subscribed threads
bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`You said: ${message.text}`);
});

// React to emoji reactions
bot.onReaction(async (thread, reaction) => {
  await thread.post(`Thanks for the ${reaction.emoji}!`);
});
```

### Event Handlers

| Handler               | Trigger                                          |
| --------------------- | ------------------------------------------------ |
| `onNewMention`        | Bot is @mentioned in a new thread                |
| `onSubscribedMessage` | New message in a thread the bot is subscribed to |
| `onReaction`          | Emoji reaction added to a message                |
| `onButtonClick`       | User clicks a button in a card                   |
| `onSlashCommand`      | Slash command invoked                            |
| `onModal`             | Modal submitted                                  |

### Supported Platforms

| Platform        | Package                  | Mentions | Messages  | Reactions | Cards     | Streaming |
| --------------- | ------------------------ | -------- | --------- | --------- | --------- | --------- |
| Slack           | `@chat-adapter/slack`    | Yes      | Yes       | Yes       | Native    | Yes       |
| Microsoft Teams | `@chat-adapter/teams`    | Yes      | Read-only | Yes       | Post+Edit | Yes       |
| Google Chat     | `@chat-adapter/gchat`    | Yes      | Yes       | Yes       | Post+Edit | Yes       |
| Discord         | `@chat-adapter/discord`  | Yes      | Yes       | Yes       | Post+Edit | Yes       |
| Telegram        | `@chat-adapter/telegram` | Yes      | Yes       | Partial   | Post+Edit | Yes       |
| GitHub          | `@chat-adapter/github`   | Yes      | Yes       | No        | No        | No        |
| Linear          | `@chat-adapter/linear`   | Yes      | Yes       | No        | No        | No        |
| WhatsApp        | `@chat-adapter/whatsapp` | N/A      | Yes       | Partial   | No        | Yes       |

### State Adapters

| Adapter                       | Use case              |
| ----------------------------- | --------------------- |
| `@chat-adapter/state-redis`   | Production (Redis)    |
| `@chat-adapter/state-ioredis` | Alt Redis client      |
| `@chat-adapter/state-pg`      | Production (Postgres) |
| `@chat-adapter/state-memory`  | Development only      |

### AI Streaming with Chat SDK

First-class support for streaming LLM responses natively on each platform — integrates with AI SDK's `streamText`.

### Guide References

- Slack bot with Next.js: https://chat-sdk.dev/docs/guides/slack-nextjs
- Durable chat sessions with Workflow: https://chat-sdk.dev/docs/guides/durable-chat-sessions-nextjs
- Code review bot with Hono: https://chat-sdk.dev/docs/guides/code-review-hono
- Discord support bot with Nuxt: https://chat-sdk.dev/docs/guides/discord-nuxt

---

## 18. Workflow DevKit — Durable AI Agents

> **Docs**: https://useworkflow.dev/ · **Package**: `workflow` + `@workflow/ai` · **GitHub**: https://github.com/vercel/workflow

Workflow DevKit makes TypeScript functions durable with `"use workflow"` and `"use step"` directives. It adds automatic retries, state persistence, resumability, observability, and human-in-the-loop to AI agent pipelines. Works with Next.js and AI SDK.

### Installation

```bash
pnpm add workflow @workflow/ai
```

### Next.js Configuration

```ts
// next.config.ts
import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... rest of your config
};

export default withWorkflow(nextConfig);
```

### Core Concepts

| Concept               | Directive / API      | Purpose                                                          |
| --------------------- | -------------------- | ---------------------------------------------------------------- |
| **Workflow function** | `"use workflow"`     | Orchestrator — coordinates steps, survives crashes               |
| **Step function**     | `"use step"`         | Unit of work — auto-retried, observable, runs in separate worker |
| **DurableAgent**      | `@workflow/ai/agent` | Drop-in replacement for AI SDK `Agent` with durable LLM calls    |
| **Hooks**             | `defineHook()`       | Type-safe pause/resume points for human-in-the-loop              |
| **Webhooks**          | `createWebhook()`    | URL-based pause/resume for external system callbacks             |
| **sleep()**           | `"5s"`, `"7 days"`   | Suspend without consuming resources                              |
| **getWritable()**     | Stream output        | Persistent stream that API endpoints can read at any time        |

### Converting an AI Agent to Durable

**Before** (standard AI SDK):

```ts
// app/api/chat/route.ts
const agent = new Agent({ model, instructions, tools });
const stream = await agent.stream({ messages });
return createUIMessageStreamResponse({ stream: stream.toUIMessageStream() });
```

**After** (durable with Workflow):

```ts
// workflows/chat/workflow.ts
import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";

export async function chatWorkflow(messages: ModelMessage[]) {
  "use workflow";

  const writable = getWritable<UIMessageChunk>();
  const agent = new DurableAgent({
    model: "bedrock/claude-4-5-haiku-20251001-v1",
    instructions: SYSTEM_PROMPT,
    tools: myTools,
  });

  await agent.stream({ messages, writable });
}

// app/api/chat/route.ts
import { start } from "workflow/api";
import { chatWorkflow } from "@/workflows/chat/workflow";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);
  const run = await start(chatWorkflow, [modelMessages]);
  return createUIMessageStreamResponse({ stream: run.readable });
}
```

### Making Tools Durable

Add `"use step"` to tool execute functions for automatic retries and observability:

```ts
async function searchPatientRecords(query: string, profileId: string) {
  "use step";
  // Full Node.js access — DB calls, APIs, etc.
  // Auto-retried up to 3 times on failure
  // Each execution appears as a discrete step in observability
  return await ragService.search(profileId, query);
}
```

### Resumable Streams

Clients can reconnect to interrupted streams without losing data:

```ts
// Client-side — drop-in transport for useChat
import { WorkflowChatTransport } from "@workflow/ai";

const { messages, sendMessage, status } = useChat({
  transport: new WorkflowChatTransport({
    api: "/api/chat",
    onChatSendMessage: (response) => {
      const runId = response.headers.get("x-workflow-run-id");
      if (runId) localStorage.setItem("active-run-id", runId);
    },
    onChatEnd: () => localStorage.removeItem("active-run-id"),
    prepareReconnectToStreamRequest: ({ api, ...rest }) => {
      const runId = localStorage.getItem("active-run-id");
      return { ...rest, api: `/api/chat/${runId}/stream` };
    },
  }),
  resume: Boolean(activeRunId),
});
```

### Human-in-the-Loop

Workflow pauses until a human approves or rejects:

```ts
// Define a typed hook
import { defineHook } from "workflow";
import { z } from "zod";

export const approvalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
    comment: z.string().optional(),
  }),
});

// In tool (no "use step" — runs in workflow context)
async function executeApproval(input, { toolCallId }) {
  const hook = approvalHook.create({ token: toolCallId });
  const { approved, comment } = await hook; // workflow pauses here
  return approved ? "Approved" : `Rejected: ${comment}`;
}

// API route to resume
export async function POST(request: Request) {
  const { toolCallId, approved, comment } = await request.json();
  await approvalHook.resume(toolCallId, { approved, comment });
  return Response.json({ success: true });
}
```

### Observability

```bash
npx workflow web    # Open Web UI dashboard
npx workflow inspect runs  # CLI inspection
```

Shows all workflow runs, step traces, retry attempts, and data passed between steps.

### Key Benefits for AI Agents

| Challenge          | Without Workflow             | With Workflow DevKit                         |
| ------------------ | ---------------------------- | -------------------------------------------- |
| Tool failures      | Crash → retry entire chain   | Auto-retry individual step (up to 3×)        |
| Network drops      | Lost stream, re-send message | Resumable stream from last token             |
| Human approval     | Custom queue + polling       | `defineHook()` + `await hook`                |
| Long-running tasks | Serverless timeout           | `sleep()` suspends without consuming compute |
| Observability      | Manual logging               | Built-in traces, metrics, step inspector     |
| State persistence  | Custom DB + session logic    | Automatic workflow state management          |

### Deployment

Works best on Vercel with Fluid compute enabled. Also runs locally, in Docker, or on any cloud.

### Error Handling

```ts
import { FatalError } from "workflow";

async function myStep() {
  "use step";
  // Retryable error — auto-retried
  throw new Error("Temporary failure");
  // Fatal error — NOT retried
  throw new FatalError("Invalid input, don't retry");
}
```

---

## Checklist: Adding a New Agent

- [ ] Create `src/data/shared/service/agents/{name}/agent.ts` with `createAgent()`
- [ ] Define tools in `agents/{name}/tools/` (or inline in `buildTools`)
- [ ] Add agent to AGENTS map in gateway
- [ ] Add keyword patterns to gateway (if applicable)
- [ ] Update LLM routing prompt with new agent option
- [ ] Update `inferNeedsRag()` RECORD_HINTS (if agent uses patient data)
- [ ] Add `case "tool-{toolName}"` in `ToolPartRenderer` for new tool UI
- [ ] Create tool card components using Mantine
- [ ] Set appropriate `maxSteps` and `useThinking`
- [ ] Add loading hints to `buildLoadingHints()` for the new agent
- [ ] Test: keyword routing, session cache, LLM fallback routing

## Checklist: Adding a New Tool to Existing Agent

- [ ] Create tool factory in `agents/{agent}/tools/{tool-name}.tool.ts`
- [ ] Add to agent's `buildTools()` return object
- [ ] Add `.describe()` to all schema properties
- [ ] If client-side: add render case in `ToolPartRenderer`
- [ ] If needs approval: set `needsApproval: true` and handle in approval card
- [ ] If accumulates state: use per-request closure pattern
- [ ] Update context cache hash if tool declarations change (automatic via `getContextCache`)

## Checklist: Adding New Middleware

- [ ] Create `src/data/shared/service/middleware/{name}.middleware.ts`
- [ ] Implement `LanguageModelMiddleware` with `specificationVersion: "v3"`
- [ ] Add to middleware array in `createAgent().stream()` (order matters!)
- [ ] Handle both `wrapGenerate` and `wrapStream` (or use `transformParams` for both)
- [ ] Add graceful degradation (timeouts, fallbacks)
- [ ] Respect `cachedContent` flag if injecting into prompt
- [ ] Test multi-step tool loops (middleware runs per LLM call, not per request)
