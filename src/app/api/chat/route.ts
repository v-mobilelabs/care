import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  createAgentUIStream,
  consumeStream,
} from "ai";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { AddMessageUseCase, PrepareChatUseCase } from "@/data/sessions";
import { CacheTags } from "@/data/cached";
import {
  extractAndSaveMemories,
  extractTextFromParts,
} from "@/data/memory/service/extract-memories";
import { CreditsExhaustedError, GuardrailError } from "@/lib/errors";

// Increased from 60s to 180s to support complex tool executions like dietPlanTool
// which generates 35+ detailed meal entries with nutrition data
export const maxDuration = 180;

export const POST = WithContext(
  async ({ user, dependentId, profileId, req }) => {
    console.log("[Chat API] Request started");

    const body = await req.json();

    // ── Prepare: validate, route, sanitize ─────────────────────────────────
    const {
      agent,
      sanitizedMessages,
      messages,
      options,
      loadingHints,
      sessionId,
      ctx,
    } = await new PrepareChatUseCase().execute({
      userId: user.uid,
      profileId,
      dependentId,
      body,
    });

    // Capture response parts and usage for Firestore persistence.
    let persistPayload: {
      responseParts: unknown[];
      userContent: string;
    } | null = null;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Schedule Firestore persistence via after() — the response is sent immediately
    // without blocking on DB writes. Next.js after() keeps the serverless function
    // alive until the task finishes, so writes are guaranteed to complete.
    after(async () => {
      // Always save the user message — even if the client disconnected before
      // the AI produced any output. This ensures the conversation history in
      // Firestore stays consistent with what the client has already shown.
      try {
        await new AddMessageUseCase().execute({
          userId: user.uid,
          profileId,
          sessionId,
          title: ctx.title,
          role: "user",
          content:
            ctx.storableParts.length > 0
              ? JSON.stringify(ctx.storableParts)
              : ctx.userQuery,
        });
      } catch (saveError) {
        console.error("[Chat API] Failed to save user message:", saveError);
      }

      // Only save the assistant message if we captured a response (onFinish
      // fires with finishReason:"abort" and empty parts on early disconnect).
      if (!persistPayload) {
        console.warn(
          "[Chat API] after(): no assistant response captured (client disconnected early)",
        );
        return;
      }
      const capturedUsage =
        totalInputTokens > 0 || totalOutputTokens > 0
          ? {
              promptTokens: totalInputTokens,
              completionTokens: totalOutputTokens,
              totalTokens: totalInputTokens + totalOutputTokens,
            }
          : undefined;
      if (capturedUsage) {
        console.log(
          `[Chat API] Agent usage — Input: ${capturedUsage.promptTokens}, Output: ${capturedUsage.completionTokens}`,
        );
      }
      try {
        console.log("[Chat API] Saving assistant message to Firestore...");
        await new AddMessageUseCase().execute({
          userId: user.uid,
          profileId,
          sessionId,
          role: "assistant",
          content: JSON.stringify(persistPayload.responseParts),
          ...(capturedUsage && { usage: capturedUsage }),
        });
        console.log("[Chat API] Assistant message saved successfully");
      } catch (saveError) {
        console.error(
          "[Chat API] Failed to save assistant message:",
          saveError,
        );
      }

      // Bust the server-side usage cache so the next SSR render shows updated credits.
      revalidateTag(CacheTags.usage(user.uid), "seconds");

      // Auto-extract memorable facts from the conversation (like Mem0's addMemories).
      try {
        await extractAndSaveMemories({
          userId: user.uid,
          profileId,
          sessionId,
          userMessage: ctx.userQuery,
          assistantMessage: extractTextFromParts(persistPayload.responseParts),
        });
      } catch (memErr) {
        console.error("[Chat API] Memory extraction failed:", memErr);
      }
    });

    // ── Stream: write progress parts, then merge the agent stream ───────────
    function handleStepFinish(stepResult: {
      usage?: { inputTokens?: number; outputTokens?: number };
    }) {
      if (stepResult.usage) {
        totalInputTokens += stepResult.usage.inputTokens ?? 0;
        totalOutputTokens += stepResult.usage.outputTokens ?? 0;
      }
    }

    function handleFinish({
      responseMessage,
      finishReason,
    }: {
      responseMessage: { parts?: unknown[] };
      finishReason?: string;
    }) {
      console.log(`[Chat API] Stream finished. Reason: ${finishReason}`);
      if (!responseMessage.parts?.length) return;
      persistPayload = {
        responseParts: responseMessage.parts,
        userContent:
          ctx.storableParts.length > 0
            ? JSON.stringify(ctx.storableParts)
            : ctx.userQuery,
      };
    }

    function handleStreamError(error: unknown): string {
      console.error(`[Chat API] Stream error:`, error);
      if (error instanceof CreditsExhaustedError) {
        return JSON.stringify({
          error: { code: error.code, message: error.toResponseMessage() },
        });
      }
      if (error instanceof GuardrailError) {
        return JSON.stringify({
          error: { code: error.code, message: error.toResponseMessage() },
        });
      }
      return "An error occurred while generating the response.";
    }

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-progress",
          data: { stage: "Preparing your response…", loadingHints },
        });

        const agentStream = await createAgentUIStream({
          agent,
          uiMessages: sanitizedMessages,
          options,
          abortSignal: req.signal,
          originalMessages: messages as Parameters<
            typeof createAgentUIStream
          >[0]["originalMessages"],
          onStepFinish: handleStepFinish,
          onFinish: handleFinish,
        });

        writer.merge(agentStream);
      },
      onError: handleStreamError,
    });

    return createUIMessageStreamResponse({
      stream,
      headers: { "X-Session-Id": sessionId },
      // Consume the SSE stream on the server so the LLM runs to completion
      // and onFinish fires even when the client disconnects mid-stream.
      consumeSseStream: ({ stream: sseStream }) => {
        consumeStream({
          stream: sseStream,
          onError: (e) => console.error("[Chat API] consumeStream error:", e),
        });
      },
    });
  },
);
