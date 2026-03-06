import { NextResponse } from "next/server";
import { z } from "zod";
import { WithContext } from "@/lib/api/with-context";
import { meetRepository } from "@/data/meet/repositories/meet.repository";

const SaveRecordingSchema = z.object({
  recordingUrl: z.string().url(),
  durationSeconds: z.number().int().min(0),
});

// POST /api/meet/[requestId]/recording — save recording URL to call history
export const POST = WithContext(
  async (ctx, { requestId }: { requestId: string }) => {
    const body = (await ctx.req.json().catch(() => ({}))) as unknown;
    const parsed = SaveRecordingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message:
              "recordingUrl (URL) and durationSeconds (int) are required",
          },
        },
        { status: 400 },
      );
    }

    const call = await meetRepository.get(requestId);
    if (!call) {
      return NextResponse.json(
        { error: { message: "Call request not found" } },
        { status: 404 },
      );
    }

    await meetRepository.saveRecording(requestId, parsed.data);
    return NextResponse.json({ ok: true });
  },
);
