import { createAgentUIStreamResponse } from "ai";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { AddMessageUseCase, PrepareChatUseCase } from "@/data/sessions";
import { CacheTags } from "@/data/cached";
import {
  extractAndSaveMemories,
  extractTextFromParts,
} from "@/data/memory/service/extract-memories";
import { CreditsExhaustedError } from "@/lib/errors";

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
      agentType,
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
      if (!persistPayload) {
        console.warn(
          "[Chat API] after(): no response parts captured, skipping save",
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
        console.log("[Chat API] Saving messages to Firestore...");
        await Promise.all([
          new AddMessageUseCase().execute({
            userId: user.uid,
            profileId,
            sessionId,
            title: ctx.title,
            role: "user",
            content:
              ctx.storableParts.length > 0
                ? JSON.stringify(ctx.storableParts)
                : ctx.userQuery,
          }),
          new AddMessageUseCase().execute({
            userId: user.uid,
            profileId,
            sessionId,
            role: "assistant",
            content: JSON.stringify(persistPayload.responseParts),
            ...(capturedUsage && { usage: capturedUsage }),
          }),
        ]);
        console.log("[Chat API] Both messages saved successfully");
      } catch (saveError) {
        console.error("[Chat API] Failed to save messages:", saveError);
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

    return createAgentUIStreamResponse({
      agent,
      uiMessages: sanitizedMessages,
      options,
      abortSignal: req.signal,
      // Type-cast: originalMessages is only used for message ID generation,
      // but the generic constraint expects InferUITools<ToolSet> vs UITools.
      originalMessages: messages as Parameters<
        typeof createAgentUIStreamResponse
      >[0]["originalMessages"],
      headers: {
        "X-Session-Id": sessionId,
        "X-Loading-Hints": JSON.stringify(loadingHints),
        "X-Agent-Type": agentType,
      },
      onStepFinish: (stepResult) => {
        if (stepResult.usage) {
          totalInputTokens += stepResult.usage.inputTokens ?? 0;
          totalOutputTokens += stepResult.usage.outputTokens ?? 0;
        }
      },
      onFinish: ({ responseMessage, finishReason }) => {
        console.log(`[Chat API] Stream finished. Reason: ${finishReason}`);
        if (!responseMessage.parts?.length) return;
        persistPayload = {
          responseParts: responseMessage.parts,
          userContent:
            ctx.storableParts.length > 0
              ? JSON.stringify(ctx.storableParts)
              : ctx.userQuery,
        };
      },
      onError: (error) => {
        console.error(`[Chat API] Stream error:`, error);
        if (error instanceof CreditsExhaustedError) {
          return JSON.stringify({
            error: {
              code: error.code,
              message: error.toResponseMessage(),
            },
          });
        }
        return "An error occurred while generating the response.";
      },
    });
  },
);
