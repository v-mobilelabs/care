import { convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import { createClinicalTools } from "@/lib/clinical-tools";
import { WithContext } from "@/lib/api/with-context";
import { extractFirstText } from "@/lib/chat/helpers";
import { AddMessageUseCase } from "@/data/sessions";
import { GetSystemPromptUseCase } from "@/data/prompts";
import { GetUserSnapshotUseCase, type UserSnapshotDto } from "@/data/profile";
import { aiService } from "@/lib/ai/ai.service";

export const maxDuration = 60;

export const POST = WithContext(
  async ({ user, dependentId, profileId, req }) => {
    const body = (await req.json()) as {
      messages: UIMessage[];
      sessionId?: string;
    };
    const { messages } = body;

    if (!messages?.length) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "messages is required." } },
        { status: 400 },
      );
    }

    // ── 1. Persist user message & resolve/create the session ─────────────────
    const firstText = extractFirstText(messages);
    const title = firstText?.slice(0, 60) ?? "New Session";

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const parts =
      lastUserMsg?.parts.filter((p) => p.type !== "tool-result") ?? [];

    let sessionId: string;

    const saved = await new AddMessageUseCase().execute(
      AddMessageUseCase.validate({
        userId: user.uid,
        profileId,
        sessionId: body.sessionId,
        title,
        role: "user",
        content: parts.length > 0 ? JSON.stringify(parts) : (firstText ?? ""),
      }),
    );
    sessionId = saved.sessionId;

    // ── 2. Stream the AI response (consumes one credit) ──────────────────────
    // Dynamically inject attachment context so the model can never hallucinate
    // a file analysis when no file is actually present.
    const latestUserMsg = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const hasAttachment =
      latestUserMsg?.parts?.some((p) => {
        const t = p.type as string;
        return t === "file" || t === "image" || t.startsWith("data-");
      }) ?? false;

    const attachmentNote = hasAttachment
      ? "\n\n## CURRENT MESSAGE CONTEXT\nThe user's current message DOES contain an attached file or image. You may analyse it and call the appropriate tools."
      : "\n\n## CURRENT MESSAGE CONTEXT\n⚠️ The user's current message does NOT contain any attached file or image. There is nothing to analyse. Do NOT call `dentalChart`, `recordCondition` based on imaging, `soapNote`, or any image/file analysis tool. If the user's text mentions a file or X-ray, call `askQuestion` to ask them to upload it.";

    const systemPrompt =
      (await new GetSystemPromptUseCase().execute({ id: "clinical-system" }))
        ?.content ?? "";

    // ── 3. Inject patient medical context on every request ──────────────────────
    // Pull the full patient snapshot (demographics, conditions, medications,
    // last SOAP note) so the AI always has complete context.
    const userSnapshot = await new GetUserSnapshotUseCase()
      .execute(
        GetUserSnapshotUseCase.validate({ userId: user.uid, dependentId }),
      )
      .catch(
        () =>
          ({ conditions: [], medications: [], context: "" }) as UserSnapshotDto,
      );
    const priorContextNote = userSnapshot.context;

    try {
      const result = await aiService.stream({
        userId: user.uid,
        system: systemPrompt + attachmentNote + priorContextNote,
        messages: await convertToModelMessages(messages),
        tools: createClinicalTools({
          userId: user.uid,
          sessionId,
          dependentId,
        }),
        stopWhen: (state) =>
          stepCountIs(20)(state) ||
          state.steps.some((step) =>
            (step.toolCalls ?? []).some(
              (tc) =>
                tc.toolName === "askQuestion" ||
                tc.toolName === "suggestActions",
            ),
          ),
      });

      // Use toUIMessageStreamResponse so the SDK assembles the full UIMessage
      // (with correctly typed parts including `input`) via its own onFinish.
      return result.toUIMessageStreamResponse({
        originalMessages: messages,
        headers: { "X-Session-Id": sessionId },
        // onFinish must be a proper async function — NOT a fire-and-forget
        // void IIFE. The SDK's internal callOnFinish does `await onFinish(...)`,
        // so returning undefined means the stream flushes and the Vercel
        // serverless function can be terminated before the Firestore write
        // completes. By awaiting here, the stream stays open until the message
        // is persisted, guaranteeing it survives a page reload.
        onFinish: async ({ responseMessage }) => {
          if (!responseMessage.parts?.length) return;
          await new AddMessageUseCase().execute(
            AddMessageUseCase.validate({
              userId: user.uid,
              profileId,
              sessionId,
              role: "assistant",
              content: JSON.stringify(responseMessage.parts),
            }),
          );
        },
      }) as unknown as NextResponse;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "CREDITS_EXHAUSTED") {
        const reset = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() + 1,
          ),
        );
        return NextResponse.json(
          {
            error: {
              code: "CREDITS_EXHAUSTED",
              message: `You've used all your credits for today. They reset at ${reset.toUTCString().replace(/ GMT$/, " UTC")}.`,
            },
          },
          { status: 402 },
        );
      }
      throw err;
    }
  },
);
