import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";

// GET /api/sessions/[sessionId]/messages-from-kb
// Retrieve messages from KB context documents via Cloud Function
export const GET = WithContext<{ sessionId: string }>(
  async ({ req }, { sessionId }) => {
    try {
      const functionApiUrl =
        process.env.FUNCTION_API_URL ||
        "https://api-f75hjfn7bq-uc.a.run.app";

      const response = await fetch(`${functionApiUrl}/kb/messages/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
        },
      });

      if (!response.ok) {
        console.error(
          "[api/sessions/messages-from-kb] Function error:",
          response.statusText,
        );
        return NextResponse.json(
          { error: "Failed to retrieve messages from KB" },
          { status: response.status },
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error("[api/sessions/messages-from-kb] Error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to retrieve messages from KB";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
);