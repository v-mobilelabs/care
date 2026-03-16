import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListMessagesUseCase } from "@/data/sessions";

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
