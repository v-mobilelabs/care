import type { ApiContext } from "@/lib/api/with-context";
import { WithContext } from "@/lib/api/with-context";
import { SaveSessionAudioUseCase } from "@/data/sessions/use-cases/save-session-audio.use-case";

export const maxDuration = 300; // Allow up to 5 minutes for audio upload

interface SaveSessionAudioRequest {
  readonly sessionId: string;
  readonly messageId: string;
  readonly audioChunks: readonly string[];
}

export const POST = WithContext(async (ctx: ApiContext) => {
  const { user, req } = ctx;
  try {
    const body = (await req.json()) as SaveSessionAudioRequest;

    const useCase = new SaveSessionAudioUseCase();
    const result = await useCase.execute({
      userId: user.uid,
      sessionId: body.sessionId,
      messageId: body.messageId,
      audioChunks: body.audioChunks as string[],
    });

    return Response.json(
      {
        success: true,
        audioParts: result.audioParts,
        totalDuration: result.totalDuration,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/sessions/audio] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
