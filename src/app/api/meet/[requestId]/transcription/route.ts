import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { meetRepository } from "@/data/meet/repositories/meet.repository";
import {
  startMeetingTranscription,
  stopMeetingTranscription,
} from "@/lib/meet/chime";

// POST /api/meet/[requestId]/transcription — start real-time transcription
export const POST = WithContext(
  async (_ctx, { requestId }: { requestId: string }) => {
    const call = await meetRepository.get(requestId);
    if (!call) {
      return NextResponse.json(
        { error: { message: "Call request not found" } },
        { status: 404 },
      );
    }
    if (!call.chimeMeetingId) {
      return NextResponse.json(
        { error: { message: "No active Chime meeting for this request" } },
        { status: 400 },
      );
    }

    await startMeetingTranscription(call.chimeMeetingId);
    return NextResponse.json({ ok: true });
  },
);

// DELETE /api/meet/[requestId]/transcription — stop transcription + save transcript
export const DELETE = WithContext(
  async (ctx, { requestId }: { requestId: string }) => {
    const call = await meetRepository.get(requestId);
    if (!call) {
      return NextResponse.json(
        { error: { message: "Call request not found" } },
        { status: 404 },
      );
    }

    const body = (await ctx.req.json().catch(() => ({}))) as {
      transcript?: string;
    };
    await Promise.all([
      call.chimeMeetingId
        ? stopMeetingTranscription(call.chimeMeetingId).catch(() => {
            /* already stopped */
          })
        : Promise.resolve(),
      body.transcript
        ? meetRepository.saveTranscript(requestId, body.transcript)
        : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
  },
);
