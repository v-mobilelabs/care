import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { CreateGeminiLiveTokenUseCase } from "@/data/live";

export const dynamic = "force-dynamic";

export const POST = WithContext(async ({ user, req }) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  console.log("[API /token] Request from user:", user.uid);
  console.log("[API /token] Body:", {
    model: typeof body.model === "string" ? body.model : "default",
    responseModalities: body.responseModalities,
  });

  const result = await new CreateGeminiLiveTokenUseCase().execute({
    userId: user.uid,
    model:
      typeof body.model === "string"
        ? body.model
        : "gemini-3.1-flash-live-preview",
    responseModalities: Array.isArray(body.responseModalities)
      ? body.responseModalities
      : ["AUDIO"],
    temperature: typeof body.temperature === "number" ? body.temperature : 0.6,
    sessionDurationMinutes:
      typeof body.sessionDurationMinutes === "number"
        ? body.sessionDurationMinutes
        : 30,
    newSessionWindowSeconds:
      typeof body.newSessionWindowSeconds === "number"
        ? body.newSessionWindowSeconds
        : 60,
  });

  console.log("[API /token] Token created successfully");

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
});
