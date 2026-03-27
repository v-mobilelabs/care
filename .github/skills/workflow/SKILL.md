---
name: workflow
description: "**WORKFLOW SKILL** — LangGraph StateGraph workflow patterns for this Next.js 16 + React 19 + TypeScript project. USE FOR: creating new LangGraph workflows; extending existing workflows; adding nodes/edges to a StateGraph; wiring cross-workflow dependencies; connecting workflows to API routes; file/upload/extraction multi-step pipelines; agentic RAG orchestration; API flow orchestration with side-effects after(). DO NOT USE FOR: Firestore data access patterns (use data-layer skill); AI agent tools/streaming (use ai-sdk skill); Mantine UI (use frontend skill); authentication flows."
---

# Workflow — LangGraph StateGraph Patterns

## Golden Rules

1. **All LangGraph workflows live in `src/workflow/`** — never put a `StateGraph` inside `src/data/*/service/`. If it uses `@langchain/langgraph`, it belongs in `src/workflow/`.
2. **File naming: `name.workflow.ts`** — e.g. `file-upload-flow.workflow.ts`, `chat-api-flow.workflow.ts`.
3. **No relative imports** — all imports in workflow files use `@/` absolute paths. Never use `../` or `./` from within a workflow file.
4. **Cross-workflow imports use `@/workflow/xxx.workflow`** — e.g. `gateway-orchestrator.workflow.ts` imports `rag-orchestrator.workflow.ts` via `@/workflow/rag-orchestrator.workflow`.
5. **API routes import workflows directly** — `import { runXxxGraph } from "@/workflow/xxx.workflow"`. Workflow functions are **not** re-exported from domain barrels (`index.ts`).
6. **Domain barrels stay clean** — `src/data/*/index.ts` exports models, repositories, services, and use cases only. No workflow functions.
7. **`after()` for all side effects** — background work (classification, cache invalidation, file cleanup) always runs inside Next.js `after()`, never blocking the response path.
8. **One graph per concern** — split upload vs delete vs patch into separate compiled graphs. Never combine unrelated flows into one large graph.
9. **State is always initialized at invocation** — pass all nullable fields as `null` / `undefined` at graph start. Never assume prior state.
10. **Errors are `ApiError` or typed domain errors** — nodes throw `ApiError.badRequest()`, `ApiError.notFound()`, etc. for client-facing errors; native `Error` for internal invariant failures.
11. **Extract reusable graph parts** — shared node handlers belong in `src/workflow/nodes/`, named conditional routers in `src/workflow/conditions/`, and canonical node-name constants in `src/workflow/edges/`.
12. **Avoid anonymous condition lambdas when reusable** — prefer exported condition functions/factories so routing logic can be tested and reused across workflows.

---

## Directory Structure

```
src/workflow/
  agent-execution.workflow.ts        # Per-agent LangGraph execution setup
  chat-api-flow.workflow.ts          # Full chat API orchestration (streaming)
  conditions/
    gateway.conditions.ts            # Named routing for gateway conditional edges
    retrieval.conditions.ts          # Named routing for RAG retrieval/evaluation flow
    patch.conditions.ts              # Shared patch/update conditional routing helpers
  edges/
    node-names.ts                    # Canonical node name constants per workflow domain
  file-upload-flow.workflow.ts       # File multipart upload + post-processing
  gateway-orchestrator.workflow.ts   # Gateway routing + RAG gating + grounding
  lab-report-api-flow.workflow.ts    # Lab report upload / extract / delete / patch
  nodes/
    multipart.nodes.ts               # Shared multipart parse/extract/read-buffer nodes
    upload.nodes.ts                  # Shared upload + schedule-classification node factories
  prescription-api-flow.workflow.ts  # Prescription extract / delete / patch
  rag-orchestrator.workflow.ts       # Agentic RAG pipeline (evaluate → repair → web)
```

---

## Anatomy of a Workflow File

```ts
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { after } from "next/server";
import { ApiError } from "@/lib/api/with-context";
// domain imports always use @/ paths
import { SomeDomainUseCase } from "@/data/some-domain";
import { AnotherUseCase } from "@/data/another-domain";

// ── Public input/output interfaces ───────────────────────────────────────────

export interface MyGraphInput {
  userId: string;
  profileId: string;
  req: Request;
}

export interface MyGraphOutput {
  result: SomeDto;
}

// ── Internal state (extends input + intermediate fields) ──────────────────────

type MyGraphState = MyGraphInput & {
  parsedBody: unknown;
  uploadedId: string | null;
  result: MyGraphOutput | null;
};

// ── Node functions ────────────────────────────────────────────────────────────

async function parseBodyNode(
  state: MyGraphState,
): Promise<Partial<MyGraphState>> {
  const body = await state.req.json().catch(() => null);
  if (!body) throw ApiError.badRequest("Invalid JSON body.");
  return { parsedBody: body };
}

async function processNode(
  state: MyGraphState,
): Promise<Partial<MyGraphState>> {
  const result = await new SomeDomainUseCase().execute({
    userId: state.userId,
  });
  return { uploadedId: result.id };
}

function scheduleBackgroundNode(state: MyGraphState): Partial<MyGraphState> {
  after(async () => {
    // Non-blocking background work (classification, cache bust, etc.)
    await new AnotherUseCase()
      .execute({ id: state.uploadedId! })
      .catch(console.error);
  });
  return {};
}

function finalizeNode(state: MyGraphState): Partial<MyGraphState> {
  if (!state.uploadedId) {
    throw new Error("[MyGraph] Missing uploadedId in finalize");
  }
  return { result: { result: { id: state.uploadedId } as SomeDto } };
}

// ── Graph definition ──────────────────────────────────────────────────────────

const myGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    req: Annotation<Request>(),
    parsedBody: Annotation<unknown>(),
    uploadedId: Annotation<string | null>(),
    result: Annotation<MyGraphOutput | null>(),
  }),
)
  .addNode("parse_body", parseBodyNode)
  .addNode("process", processNode)
  .addNode("schedule_background", scheduleBackgroundNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "parse_body")
  .addEdge("parse_body", "process")
  .addEdge("process", "schedule_background")
  .addEdge("schedule_background", "finalize")
  .addEdge("finalize", END)
  .compile();

// ── Public runner ─────────────────────────────────────────────────────────────

export async function runMyGraph(input: MyGraphInput): Promise<MyGraphOutput> {
  const finalState = (await myGraph.invoke({
    ...input,
    parsedBody: null,
    uploadedId: null,
    result: null,
  })) as MyGraphState;

  if (!finalState.result) {
    throw new Error("[MyGraph] Missing finalized result");
  }
  return finalState.result;
}
```

---

## Existing Workflows — Quick Reference

### `chat-api-flow.workflow.ts`

- **Exports**: `runChatApiFlow(input)`, `ChatApiFlowInput`
- **Purpose**: Full chat streaming orchestration — preContext, gateway routing, agent streaming, persistence (assessments, diet plans, summaries, evidence, memories)
- **Used by**: `src/app/api/chat/route.ts`
- **Key pattern**: streaming via `createUIMessageStreamResponse`, side-effect persistence via `after()`

### `gateway-orchestrator.workflow.ts`

- **Exports**: `runGatewayOrchestrator(input)`, `GatewayOrchestratorResult`
- **Purpose**: Route query → keyword fast-path → LLM routing → RAG gate → agentic RAG → grounding reuse
- **Used by**: `src/data/sessions/use-cases/prepare-chat.use-case.ts`
- **Depends on**: `@/workflow/rag-orchestrator.workflow`

### `agent-execution.workflow.ts`

- **Exports**: `createAgentExecutionGraph`, `runAgentExecutionGraph`, `AgentExecutionOptions`, `AgentThinkingLevel`
- **Purpose**: Per-agent LangGraph setup — injects prompt, tools, preContext, cachedContent, thinking level into `ToolLoopAgent`
- **Used by**: `src/data/shared/service/agents/base/agent.ts` → consumed by all specialist agents

### `rag-orchestrator.workflow.ts`

- **Exports**: `runAgenticRagLangGraph`, `RagEvaluationMeta`, `AgenticRagGraphInput`
- **Purpose**: Agentic RAG pipeline — evaluate → repair → web fallback → finalize
- **Used by**: `@/workflow/gateway-orchestrator.workflow` and `src/data/shared/service/middleware/pre-run.ts` (type import)

### `file-upload-flow.workflow.ts`

- **Exports**: `runFilesUploadGraph`, `scheduleFileUploadPostProcessing`, `FilesUploadGraphInput`, `FilesUploadGraphOutput`
- **Purpose**: Multipart form parse → file validate → buffer read → Storage upload → post-processing schedule
- **Used by**: `src/app/api/files/route.ts`

### `lab-report-api-flow.workflow.ts`

- **Exports**: `runLabReportUploadAndExtractGraph`, `runLabReportDeleteGraph`, `runLabReportPatchGraph`
- **Purpose**: Lab report upload+extraction, deletion with file cleanup, field patching
- **Used by**: `src/app/api/lab-reports/route.ts`, `src/app/api/lab-reports/[recordId]/route.ts`

### `prescription-api-flow.workflow.ts`

- **Exports**: `runPrescriptionExtractFromRequestGraph`, `runPrescriptionExtractByFileGraph`, `runPrescriptionDeleteGraph`, `runPrescriptionPatchSessionGraph`
- **Purpose**: Prescription extraction from request/file, deletion with file cleanup, session patching
- **Used by**: `src/app/api/prescriptions/route.ts`, `src/app/api/prescriptions/[fileId]/route.ts`, `src/app/api/prescriptions/[fileId]/extract/route.ts`

---

## How to Wire a New Workflow to an API Route

```ts
// src/app/api/my-domain/route.ts
import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListMyThingsUseCase } from "@/data/my-domain"; // ✅ use case from barrel
import { runMyGraph } from "@/workflow/my-domain-flow.workflow"; // ✅ workflow from @/workflow

export const POST = WithContext(async ({ user, profileId, req }) => {
  const result = await runMyGraph({ userId: user.uid, profileId, req });
  return NextResponse.json(result);
});
```

**Never import a workflow from a domain barrel:**

```ts
// ❌ Wrong — workflows don't belong in barrels
import { runMyGraph } from "@/data/my-domain";

// ✅ Correct — import directly from the workflow
import { runMyGraph } from "@/workflow/my-domain-flow.workflow";
```

---

## Adding a New Workflow

1. **Create `src/workflow/my-domain-flow.workflow.ts`** following the anatomy above.
2. **Use `@/` absolute imports only** — no relative paths.
3. **Cross-workflow dependency?** Import via `@/workflow/other.workflow`.
4. **Do NOT add exports to any `src/data/*/index.ts` barrel.**
5. **Import directly in the API route** from `@/workflow/my-domain-flow.workflow`.
6. **Register in this SKILL.md** — add an entry to the Quick Reference table.

---

## Conditional Edges (Branching Graphs)

Use `addConditionalEdges` for flows with decision branches:

```ts
.addConditionalEdges("gate_rag", (state) => {
  if (state.requiresRag) return "run_rag";
  return "finalize";
}, {
  run_rag: "run_rag",
  finalize: "finalize",
})
```

See `gateway-orchestrator.workflow.ts` for a production example with 4-way branching.

---

## Error Handling Conventions

| Scenario                           | Throw                                        |
| ---------------------------------- | -------------------------------------------- |
| Bad user input (missing field etc) | `ApiError.badRequest("message")`             |
| Resource not found                 | `ApiError.notFound("message")`               |
| Internal invariant broken          | `new Error("[GraphName] Invariant message")` |
| Credits exhausted                  | `CreditsExhaustedError`                      |
| Guardrail triggered                | `GuardrailError`                             |

---

## `after()` Pattern for Side Effects

All non-blocking background work (classification, cache invalidation, cleanup) must use Next.js `after()`:

```ts
function scheduleBackgroundWorkNode(state: MyState): Partial<MyState> {
  if (!state.uploadedFile) throw new Error("[MyGraph] Missing file for background");

  after(async () => {
    await new ClassifyFileUseCase()
      .execute({ fileId: state.uploadedFile!.id, ... })
      .catch((err: unknown) => console.error("[my-domain] classify error:", err));
  });

  return {};
}
```

**Never `await` background work in the node return chain** — it blocks the response.
