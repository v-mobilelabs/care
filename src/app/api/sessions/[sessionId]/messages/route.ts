import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListMessagesUseCase } from "@/data/sessions";

// GET /api/sessions/[sessionId]/messages
export const GET = WithContext<{ sessionId: string }>(
  async ({ user }, { sessionId }) => {
    const input = ListMessagesUseCase.validate({
      userId: user.uid,
      sessionId,
    });
    const messages = await new ListMessagesUseCase().execute(input);
    return NextResponse.json(messages);
  },
);
