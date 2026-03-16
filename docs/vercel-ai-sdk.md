# Vercel AI SDK v6 — Best Practices, Recommendations & Advanced Techniques

> Based on AI SDK `^6.0.105`, `@ai-sdk/react ^3.0.107`, `@ai-sdk/google ^3.0.34`

---

## Table of Contents

- [1. Best Practices](#1-best-practices)
  - [1.1 Streaming Over Generating](#11-streaming-over-generating)
  - [1.2 Server-Side Tool Loops](#12-server-side-tool-loops)
  - [1.3 Structured Output with `Output.object()`](#13-structured-output-with-outputobject)
  - [1.4 Message Conversion](#14-message-conversion)
  - [1.5 Error Handling](#15-error-handling)
  - [1.6 AbortSignal Propagation](#16-abortsignal-propagation)
  - [1.7 maxDuration for Serverless](#17-maxduration-for-serverless)
  - [1.8 Tool Definition Patterns](#18-tool-definition-patterns)
  - [1.9 Credit / Rate Limiting via Middleware](#19-credit--rate-limiting-via-middleware)
  - [1.10 Always Consume the Stream](#110-always-consume-the-stream)
- [2. Recommendations](#2-recommendations)
  - [2.1 Use `ToolLoopAgent` for Agents](#21-use-toolloopagent-for-agents)
  - [2.2 Gateway Routing Pattern](#22-gateway-routing-pattern)
  - [2.3 Client-Side `useChat` Configuration](#23-client-side-usechat-configuration)
  - [2.4 DB Hydration & Cache Sync](#24-db-hydration--cache-sync)
  - [2.5 Lifecycle Callbacks for Observability](#25-lifecycle-callbacks-for-observability)
  - [2.6 Use `smoothStream` for UX](#26-use-smoothstream-for-ux)
  - [2.7 Typed Tool Parts in UI](#27-typed-tool-parts-in-ui)
  - [2.8 Schema Descriptions](#28-schema-descriptions)
  - [2.9 `sendAutomaticallyWhen` for Client Tools](#29-sendautomaticallywhen-for-client-tools)
  - [2.10 Tool Execution Approval](#210-tool-execution-approval)
- [3. Advanced Techniques](#3-advanced-techniques)
  - [3.1 Language Model Middleware](#31-language-model-middleware)
  - [3.2 Google Context Caching](#32-google-context-caching)
  - [3.3 Thinking / Reasoning Mode](#33-thinking--reasoning-mode)
  - [3.4 RAG as Middleware or Parallel Fetch](#34-rag-as-middleware-or-parallel-fetch)
  - [3.5 Abstract Agent Base Class](#35-abstract-agent-base-class)
  - [3.6 Per-Request Tool Closures](#36-per-request-tool-closures)
  - [3.7 Async Persistence with `after()`](#37-async-persistence-with-after)
  - [3.8 Custom Stream Transformations](#38-custom-stream-transformations)
  - [3.9 Parallel Gateway + Embedding](#39-parallel-gateway--embedding)
  - [3.10 `providerMetadata` / `thoughtSignature`](#310-providermetadata--thoughtsignature)
  - [3.11 Multi-Provider Setup](#311-multi-provider-setup)
  - [3.12 End-to-End Type Safety with `InferAgentUIMessage`](#312-end-to-end-type-safety-with-inferagentuimessage)

---

## 1. Best Practices

### 1.1 Streaming Over Generating

For interactive use cases (chatbots, real-time apps), always prefer `streamText` over `generateText`. It starts sending data immediately, eliminating the wait for full completion.

```ts
import { streamText } from "ai";

const result = streamText({
  model,
  messages,
  system: "You are a helpful assistant.",
});

return result.toUIMessageStreamResponse();
```

Reserve `generateText` for non-interactive tasks (batch processing, background jobs, structured extraction).

---

### 1.2 Server-Side Tool Loops

Use `stopWhen: stepCountIs(N)` to enable server-side multi-step tool execution. This lets the model chain multiple tool calls in a single HTTP request — no client round-trips between steps.

```ts
import { streamText, stepCountIs } from "ai";

const result = streamText({
  model,
  messages,
  tools: {
    /* ... */
  },
  stopWhen: stepCountIs(10), // max 10 tool iterations
});
```

**Guidelines:**

- Set a reasonable cap (5–20 steps). Complex agents (diet planners, multi-fetch) may need 15+.
- Each step = one LLM call (text or tool call). The loop continues until text is generated or the limit is reached.
- When combining with `Output.object()`, structured output generation counts as a step — account for this in your step limit.

---

### 1.3 Structured Output with `Output.object()`

Use `Output.object({ schema })` with Zod schemas for type-safe structured extraction. The SDK validates the response automatically.

```ts
import { generateText, Output } from "ai";
import { z } from "zod";

const { output } = await generateText({
  model,
  output: Output.object({
    schema: z.object({
      sentiment: z.enum(["positive", "neutral", "negative"]),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
  }),
  prompt: "Analyze this feedback...",
});
```

**Other Output types:**

- `Output.array({ element })` — arrays of typed objects; use `elementStream` for element-by-element streaming
- `Output.choice({ options })` — classify into fixed string options
- `Output.json()` — unstructured JSON (no schema validation)
- `Output.text()` — plain text (default)

**Tip:** Add `.describe("...")` to schema properties for better model guidance.

---

### 1.4 Message Conversion

Always convert `UIMessage[]` → `ModelMessage[]` before passing to `streamText`/`generateText`:

```ts
import { convertToModelMessages } from "ai";
import type { UIMessage } from "ai";

const { messages } = (await req.json()) as { messages: UIMessage[] };
const converted = await convertToModelMessages(messages);

const result = streamText({ model, messages: converted });
```

This handles tool call serialization, file data encoding, and message role mapping.

---

### 1.5 Error Handling

`streamText` starts streaming immediately and suppresses errors to prevent server crashes. Always use the `onError` callback:

```ts
const result = streamText({
  model,
  messages,
  onError({ error }) {
    console.error("[Stream Error]", error);
  },
});
```

For tool errors in the response stream:

```ts
return result.toUIMessageStreamResponse({
  onError: (error) => `Tool error: ${error.message}`,
});
```

For structured output, catch `NoObjectGeneratedError`:

```ts
import { NoObjectGeneratedError } from "ai";

try {
  await generateText({ model, output: Output.object({ schema }), prompt });
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log("Cause:", error.cause);
    console.log("Text:", error.text);
  }
}
```

---

### 1.6 AbortSignal Propagation

Forward the request's AbortSignal to cancel LLM calls when the client disconnects:

```ts
export async function POST(req: Request) {
  const result = streamText({
    model,
    messages,
    abortSignal: req.signal, // client disconnect cancels the stream
  });
  return result.toUIMessageStreamResponse();
}
```

---

### 1.7 maxDuration for Serverless

Set `maxDuration` on API routes that stream or execute tools. Default 60s is often too short:

```ts
// Complex tool chains (diet plans, multi-step analysis)
export const maxDuration = 180;

// Simple chat
export const maxDuration = 60;
```

---

### 1.8 Tool Definition Patterns

Use `tool()` with `inputSchema` (Zod) and `execute`:

```ts
import { tool } from "ai";
import { z } from "zod";

const weatherTool = tool({
  description: "Get weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, condition: "sunny" };
  },
});
```

**Client-side tools** omit `execute` — they're rendered as UI and resolved via `addToolOutput`:

```ts
const askConfirmation = tool({
  description: "Ask the user for confirmation",
  inputSchema: z.object({
    message: z.string().describe("The confirmation message"),
  }),
  // No execute — handled on client
});
```

---

### 1.9 Credit / Rate Limiting via Middleware

Use `wrapLanguageModel` to intercept model calls for rate limiting, credit gating, or usage tracking:

```ts
import { wrapLanguageModel } from "ai";
import type { LanguageModelMiddleware } from "ai";

const creditMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapGenerate: async ({ doGenerate }) => {
    await checkAndConsumeCredit();
    return doGenerate();
  },
  wrapStream: async ({ doStream }) => {
    await checkAndConsumeCredit();
    return doStream();
  },
};

const gatedModel = wrapLanguageModel({
  model: baseModel,
  middleware: creditMiddleware,
});
```

---

### 1.10 Always Consume the Stream

`streamText` uses backpressure — tokens are only generated as they're consumed. If you don't read the stream, the model call won't complete. Always return the stream or pipe it:

```ts
// ✅ Return to client
return result.toUIMessageStreamResponse();

// ✅ Or consume manually
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

---

## 2. Recommendations

### 2.1 Use `ToolLoopAgent` for Agents

Prefer `ToolLoopAgent` over raw `streamText` loops for agent patterns. It manages the tool loop, context, and stopping conditions:

```ts
import { ToolLoopAgent, stepCountIs, tool } from "ai";

const agent = new ToolLoopAgent({
  model,
  instructions: "You are a medical assistant...",
  tools: { askQuestion, submitAssessment },
  stopWhen: stepCountIs(10),
});

// In API route:
const result = await agent.stream({
  messages,
  abortSignal: req.signal,
});
```

**Why ToolLoopAgent:**

- Reduces boilerplate (no manual loop)
- Single place to define behavior, tools, and config
- Full TypeScript support for tools and outputs
- Lifecycle callbacks for observability

---

### 2.2 Gateway Routing Pattern

For multi-agent systems, route queries to specialized agents using a lightweight classification step:

```ts
// 1. Keyword prefilter (0ms, deterministic)
const keywordResult = tryKeywordRoute(userQuery);
if (keywordResult) return keywordResult;

// 2. Session cache (reuse previous routing in same conversation)
if (sessionId) {
  const cached = sessionCache.get(sessionId);
  if (cached) return cached;
}

// 3. LLM-based routing (fast/lite model, no credit consumed)
const decision = await extractObject(RoutingSchema, routingPrompt, {
  useLite: true,
  skipCredit: true,
});
```

**Tiered routing** keeps latency low: keywords → cache → LLM fallback.

---

### 2.3 Client-Side `useChat` Configuration

Use `DefaultChatTransport` for full control over the HTTP layer:

```ts
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage, status, stop, regenerate } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { sessionId },
    headers: dependentId ? { "x-dependent-id": dependentId } : {},
  }),
  messages: initialMessages,
});
```

**Status values:** `"ready"` | `"submitted"` | `"streaming"`

---

### 2.4 DB Hydration & Cache Sync

Hydrate `useChat` from database on first load, sync back when stream finishes:

```ts
// Hydrate once
useEffect(() => {
  if (dbLoaded && !hasHydrated.current) {
    hasHydrated.current = true;
    setMessages(dbMessages.map(dbToUIMessage));
  }
}, [dbLoaded, dbMessages]);

// Sync back when stream finishes
useEffect(() => {
  if (status === "ready" && hasHydrated.current) {
    setMessagesCache(messages.map(uiToRecord));
    invalidateSessions();
  }
}, [status]);
```

---

### 2.5 Lifecycle Callbacks for Observability

Use the experimental lifecycle callbacks on `streamText`, `generateText`, and `ToolLoopAgent` for logging:

```ts
const result = streamText({
  model,
  messages,
  experimental_onStart({ model }) {
    console.log("Stream started", model.modelId);
  },
  experimental_onToolCallStart({ toolCall }) {
    console.log(`Tool: ${toolCall.toolName}`);
  },
  experimental_onToolCallFinish({ toolCall, durationMs, success }) {
    console.log(`Tool done: ${toolCall.toolName} (${durationMs}ms)`, {
      success,
    });
  },
  onStepFinish({ stepNumber, usage, finishReason }) {
    console.log(`Step ${stepNumber}:`, finishReason, usage);
  },
  onFinish({ totalUsage, steps }) {
    console.log(
      "Done:",
      totalUsage.totalTokens,
      "tokens,",
      steps.length,
      "steps",
    );
  },
});
```

---

### 2.6 Use `smoothStream` for UX

Smooth out text streaming for a polished typing effect:

```ts
import { smoothStream, streamText } from "ai";

const result = streamText({
  model,
  prompt: "...",
  experimental_transform: smoothStream(),
});
```

---

### 2.7 Typed Tool Parts in UI

Render tool UI via typed `parts` on `UIMessage`. Each tool gets a `tool-{toolName}` part type:

```tsx
message.parts.map((part) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;
    case "tool-askQuestion":
      return <QuestionCard part={part} />;
    case "tool-submitPrescription":
      return <PrescriptionCard part={part} />;
    case "step-start":
      return index > 0 ? <Divider /> : null;
  }
});
```

**Part states:** `"input-streaming"` → `"input-available"` → `"output-available"` (or `"output-error"`)

---

### 2.8 Schema Descriptions

Add `.describe()` to schema properties. This significantly improves structured output quality:

```ts
const schema = z.object({
  question: z.string().describe("A focused clinical follow-up question"),
  type: z
    .enum(["yes_no", "single_choice", "scale", "free_text"])
    .describe("The response format for the question"),
  options: z
    .array(z.string())
    .optional()
    .describe("Answer choices (required for single_choice)"),
});
```

---

### 2.9 `sendAutomaticallyWhen` for Client Tools

Auto-submit after all client-side tool results are collected:

```ts
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

const { messages, sendMessage, addToolOutput } = useChat({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  async onToolCall({ toolCall }) {
    if (toolCall.toolName === "getLocation") {
      addToolOutput({
        tool: "getLocation",
        toolCallId: toolCall.toolCallId,
        output: navigator.geolocation ? "..." : "unavailable",
      });
    }
  },
});
```

---

### 2.10 Tool Execution Approval

Require user confirmation before sensitive server-side tools execute:

```ts
// Server
const deleteTool = tool({
  description: "Delete a record",
  inputSchema: z.object({ id: z.string() }),
  needsApproval: true, // or a function: (input) => input.id.startsWith("prod-")
  execute: async ({ id }) => {
    /* delete logic */
  },
});
```

```ts
// Client
const { addToolApprovalResponse } = useChat({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
});

// In render:
if (part.state === "approval-requested") {
  return (
    <div>
      <button onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: true })}>
        Approve
      </button>
    </div>
  );
}
```

---

## 3. Advanced Techniques

### 3.1 Language Model Middleware

Middleware intercepts model calls. Three hooks: `transformParams`, `wrapGenerate`, `wrapStream`.

```ts
import { wrapLanguageModel } from "ai";
import type { LanguageModelMiddleware } from "ai";

// Logging middleware
const logMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapGenerate: async ({ doGenerate, params }) => {
    console.log("Params:", JSON.stringify(params));
    const result = await doGenerate();
    console.log("Result:", result.text);
    return result;
  },
  wrapStream: async ({ doStream, params }) => {
    console.log("Stream params:", params);
    const { stream, ...rest } = await doStream();
    return {
      stream: stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            // inspect or modify chunks
            controller.enqueue(chunk);
          },
        }),
      ),
      ...rest,
    };
  },
};

const model = wrapLanguageModel({
  model: baseModel,
  middleware: [logMiddleware, creditMiddleware], // applied in order
});
```

**Built-in middleware:**

- `extractReasoningMiddleware({ tagName: "think" })` — extract `<think>` blocks as reasoning
- `extractJsonMiddleware()` — strip markdown code fences from JSON output
- `simulateStreamingMiddleware()` — make non-streaming models behave like streaming
- `defaultSettingsMiddleware({ settings })` — apply default temperature, maxTokens, etc.
- `addToolInputExamplesMiddleware()` — inject tool input examples into descriptions

---

### 3.2 Google Context Caching

Cache static system prompts + tool declarations as a Google `cachedContent` resource to reduce latency and cost for repeated calls:

```ts
// 1. Create cache via Google REST API
const cacheResource = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/cachedContents`,
  {
    method: "POST",
    body: JSON.stringify({
      model: "models/gemini-3.1-pro-preview",
      displayName: "my-agent-cache",
      systemInstruction: { parts: [{ text: staticPrompt }] },
      tools: [{ functionDeclarations: toolDeclarations }],
      expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  },
);
const { name } = await cacheResource.json();

// 2. Pass cache name to providerOptions
const result = streamText({
  model,
  messages, // system messages already in cache — must be omitted
  providerOptions: {
    google: { cachedContent: name },
  },
});
```

**Critical:** When `cachedContent` is active, the Google API rejects requests that also include `system_instruction` or `tools`. Use middleware to strip them:

```ts
const cachedContentMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  transformParams: async ({ params }) => {
    if (!params.providerOptions?.google?.cachedContent) return params;
    return {
      ...params,
      prompt: params.prompt.filter((m) => m.role !== "system"),
      tools: undefined,
      toolChoice: undefined,
    };
  },
};
```

**Cache key strategy:** Hash `systemPrompt + modelId + toolNames` to detect changes. Invalidate when the hash changes.

---

### 3.3 Thinking / Reasoning Mode

Enable extended reasoning via `providerOptions` (model-specific):

```ts
import type { GoogleLanguageModelOptions } from "@ai-sdk/google";

const result = streamText({
  model: google("gemini-3.1-pro-preview"),
  messages,
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingLevel: "high", // "low" | "medium" | "high"
        includeThoughts: true, // stream reasoning tokens to client
      },
    } satisfies GoogleLanguageModelOptions,
  },
});
```

**Adaptive thinking:** Use a gateway to set thinking level based on query complexity:

```ts
function inferThinkingLevel(query: string, hasAttachment?: boolean) {
  if (hasAttachment) return "high";
  if (isSimpleRecall(query)) return "low";
  return "medium";
}
```

**`thoughtSignature`:** Google returns an opaque `thoughtSignature` in `providerMetadata` for each part. The SDK round-trips it automatically to preserve reasoning context across turns. You don't need to handle it — just don't strip it from messages.

---

### 3.4 RAG as Middleware or Parallel Fetch

**Approach A — Middleware (model-agnostic):**

```ts
const ragMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => {
    const userQuery = getLastUserMessageText(params.prompt);
    if (!userQuery) return params;

    const context = await ragService.search(userQuery);
    return addToLastUserMessage({ params, text: context });
  },
};
```

**Approach B — Parallel fetch before stream (more control):**

```ts
// Run gateway routing + RAG embedding in parallel
const [gatewayDecision, queryEmbedding] = await Promise.all([
  gatewayAgent.decide({ userQuery }),
  ragService.embedQuery(userQuery),
]);

// Then fetch RAG context and guidelines in parallel
const [ragResult, guidelines] = await Promise.allSettled([
  withTimeout(ragContextBuilder.buildContext({ queryEmbedding }), 10_000),
  withTimeout(guidelineService.search(userQuery, { queryEmbedding }), 10_000),
]);
```

**Always set timeouts** on RAG fetches to prevent stalling the chat response.

---

### 3.5 Abstract Agent Base Class

For multi-agent systems, create an abstract base class to standardize the lifecycle:

```ts
abstract class AIAgentBaseClass implements Agent<AgentCallOptions, ToolSet> {
  abstract readonly id: string;
  abstract readonly tools: ToolSet;

  protected abstract buildSystemPrompt(): string;
  protected abstract buildTools(options: AgentCallOptions): ToolSet;

  // Optional overrides
  protected buildDynamicContext(options: AgentCallOptions): string { return ""; }
  protected get model(): LanguageModel { return defaultModel; }
  protected get useThinking(): boolean { return true; }
  protected get maxSteps(): number { return 10; }

  async stream(params: AgentStreamParameters<AgentCallOptions, ToolSet>) {
    // 1. Credit check
    // 2. Parallel RAG + guidelines fetch
    // 3. Build system prompt + dynamic context
    // 4. Build per-request tools
    // 5. Delegate to ToolLoopAgent
    return new ToolLoopAgent({
      model: this.model,
      instructions: assembledPrompt,
      tools: this.buildTools(params.options),
      stopWhen: stepCountIs(this.maxSteps),
      providerOptions: { google: { thinkingConfig: { ... } } },
    }).stream({ messages, abortSignal });
  }
}
```

**Subclasses** only implement `buildSystemPrompt()`, `buildTools()`, and optionally override config.

---

### 3.6 Per-Request Tool Closures

Bind tools to request context so they can access user-specific data and accumulate state across steps:

```ts
protected buildTools(options: AgentCallOptions): ToolSet {
  const collectedDays: DietDay[] = []; // per-request state

  return {
    submitDailyPlan: tool({
      description: "Submit one day of the meal plan",
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
}
```

Each request gets a fresh closure — no cross-request contamination.

---

### 3.7 Async Persistence with `after()`

Use Next.js `after()` to persist messages without blocking the streaming response:

```ts
import { after } from "next/server";

const result = await agent.stream({
  messages,
  options,
  abortSignal: req.signal,
});

let persistPayload: { parts: unknown; usage: unknown } | null = null;

after(async () => {
  if (!persistPayload) return;
  await saveMessages(sessionId, persistPayload);
});

return result.toUIMessageStreamResponse({
  headers: { "X-Session-Id": sessionId },
  onFinish: ({ responseMessage }) => {
    persistPayload = { parts: responseMessage.parts, usage: result.usage };
  },
});
```

The response streams immediately. `after()` runs asynchronously after the response finishes.

---

### 3.8 Custom Stream Transformations

Transform the stream before it reaches the client with `experimental_transform`:

```ts
import { streamText, type TextStreamPart, type ToolSet } from "ai";

// Uppercase transformation
const upperTransform =
  <TOOLS extends ToolSet>() =>
  (options: { tools: TOOLS; stopStream: () => void }) =>
    new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        controller.enqueue(
          chunk.type === "text-delta"
            ? { ...chunk, text: chunk.text.toUpperCase() }
            : chunk,
        );
      },
    });

const result = streamText({
  model,
  prompt: "...",
  experimental_transform: [smoothStream(), upperTransform()],
});
```

**Use `stopStream()`** for guardrails — inject `finish-step` + `finish` events when stopping early.

---

### 3.9 Parallel Gateway + Embedding

Run independent operations concurrently to reduce latency:

```ts
// Gateway routing and query embedding are independent — run concurrently
// saves ~350ms of sequential latency
const [gatewayDecision, queryEmbedding] = await Promise.all([
  gatewayAgent.decide({ userQuery, hasAttachment, userId, sessionId }),
  ragService.embedQuery(userQuery),
]);

// Use queryEmbedding for both RAG search and guideline search
const [ragResult, guidelines] = await Promise.allSettled([
  ragContextBuilder.buildContext({ queryEmbedding, ... }),
  guidelineService.search(userQuery, { queryEmbedding }),
]);
```

---

### 3.10 `providerMetadata` / `thoughtSignature`

Google Gemini returns `thoughtSignature` — an opaque token that preserves the model's internal reasoning state across turns:

```jsonc
// Appears on streamed parts
{
  "callProviderMetadata": {
    "google": {
      "thoughtSignature": "Er0SCroSAb4+9vt...", // base64 opaque token
    },
  },
}
```

**The SDK handles this automatically:**

1. Gemini returns `thoughtSignature` on each content part
2. SDK includes it in `providerMetadata` of the message part
3. On next request, `convertToModelMessages` sends it back to Gemini
4. Gemini restores reasoning state without re-deriving it

**Action required:** None. Just don't strip `providerMetadata` from messages when persisting.

---

### 3.11 Multi-Provider Setup

Use multiple model tiers for different tasks:

```ts
import { google } from "@ai-sdk/google";

const models = {
  // Deep reasoning — clinical chat, complex analysis
  pro: google("gemini-3.1-pro-preview"),

  // Fast — onboarding, simple queries
  flash: google("gemini-3-flash-preview"),

  // Ultra-fast — gateway routing, classification (no credit consumed)
  lite: google("gemini-2.5-flash-lite"),
};
```

Route by task complexity:

- **Gateway routing**: lite model, `skipCredit: true`
- **Simple chat**: flash model, thinking: `"low"`
- **Complex analysis**: pro model, thinking: `"high"`

---

### 3.12 End-to-End Type Safety with `InferAgentUIMessage`

Infer UIMessage types from your agent definition for full type safety in client components:

```ts
import { ToolLoopAgent, InferAgentUIMessage } from "ai";

const myAgent = new ToolLoopAgent({
  model,
  tools: { askQuestion: askQuestionTool, submitPlan: submitPlanTool },
});

export type MyAgentUIMessage = InferAgentUIMessage<typeof myAgent>;
```

```tsx
// Client component gets typed tool parts
import type { MyAgentUIMessage } from "@/agents/my-agent";

const { messages } = useChat<MyAgentUIMessage>();

// part.type is "tool-askQuestion" | "tool-submitPlan" | "text" | ...
// part.input and part.output are fully typed
```

---

## Quick Reference

| Pattern           | Import                                  | Key Option                                      |
| ----------------- | --------------------------------------- | ----------------------------------------------- |
| Streaming chat    | `streamText`                            | `stopWhen: stepCountIs(N)`                      |
| Structured output | `Output.object({ schema })`             | `.describe()` on fields                         |
| Agents            | `ToolLoopAgent`                         | `instructions`, `tools`, `stopWhen`             |
| Middleware        | `wrapLanguageModel`                     | `transformParams`, `wrapGenerate`, `wrapStream` |
| Client hooks      | `useChat` from `@ai-sdk/react`          | `transport`, `sendAutomaticallyWhen`            |
| Tool approval     | `tool({ needsApproval })`               | `addToolApprovalResponse`                       |
| Context cache     | `providerOptions.google.cachedContent`  | Strip system/tools via middleware               |
| Thinking mode     | `providerOptions.google.thinkingConfig` | `thinkingLevel`, `includeThoughts`              |
| Stream smooth     | `experimental_transform`                | `smoothStream()`                                |
| Async persist     | `after()` from `next/server`            | `onFinish` callback                             |

---

## Official Documentation

- [AI SDK Docs](https://ai-sdk.dev/docs)
- [Agents — Overview](https://ai-sdk.dev/docs/agents/overview)
- [Agents — Building](https://ai-sdk.dev/docs/agents/building-agents)
- [Agents — Workflow Patterns](https://ai-sdk.dev/docs/agents/workflows)
- [Agents — Loop Control](https://ai-sdk.dev/docs/agents/loop-control)
- [Core — Generating Text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [Core — Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [Core — Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Core — Middleware](https://ai-sdk.dev/docs/ai-sdk-core/middleware)
- [Core — Embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [UI — Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [UI — Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
- [UI — Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
- [UI — Transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- [Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
