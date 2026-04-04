import { NextResponse } from "next/server";
import { z } from "zod";
import { WithContext } from "@/lib/api/with-context";
import { AddMessageSchema, ListMessagesUseCase, messageService } from "@/data/sessions";

// GET /api/sessions/[sessionId]/messages?cursor=...&limit=...
export const GET = WithContext<{ sessionId: string }>(
  async ({ user, profileId, req }, { sessionId }) => {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await new ListMessagesUseCase().execute({
      userId: user.uid,
      profileId,
      sessionId,
      ...(cursor && { cursor }),
      ...(limit && { limit }),
    });
    return NextResponse.json(result);
  },
);

// POST /api/sessions/[sessionId]/messages
// Save a message (text, audio, etc) directly to the messages collection
export const POST = WithContext<{ sessionId: string }>(
  async ({ user, profileId, req }, { sessionId }) => {
    try {
      const body = (await req.json()) as Record<string, unknown>;

      // Validate input
      const input = AddMessageSchema.parse({
        userId: user.uid,
        profileId,
        sessionId,
        ...body,
      });

      // Add the message via service (auto-infers kind if not provided)
      const message = await messageService.add(input);

      return NextResponse.json(message, { status: 201 });
    } catch (err) {
      console.error("[api/sessions/messages] Error:", err);
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid message data", details: err.issues },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
);
