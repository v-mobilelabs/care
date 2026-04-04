import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { bucket } from "@/lib/firebase/admin";

// Signed URL lifetime: 7 days
const SIGNED_URL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * GET /api/sessions/[sessionId]/audio/[messageId]
 * Returns a fresh signed URL for the audio file.
 * This allows audio URLs to be generated on-demand instead of being stored
 * in messages, preventing expiry issues.
 */
export const GET = WithContext<{ sessionId: string; messageId: string }>(
  async (_ctx, { sessionId, messageId }) => {
    try {
      // Audio file path: sessions/{sessionId}/audio/{messageId}.wav
      const audioPath = `sessions/${sessionId}/audio/${messageId}.wav`;
      const gcsFile = bucket.file(audioPath);

      // Check if file exists
      const [exists] = await gcsFile.exists();
      if (!exists) {
        throw ApiError.notFound(
          `Audio not found: sessions/${sessionId}/audio/${messageId}.wav`,
        );
      }

      // Generate fresh signed URL
      const [signedUrl] = await gcsFile.getSignedUrl({
        action: "read" as const,
        expires: Date.now() + SIGNED_URL_EXPIRY_MS,
      });

      return NextResponse.json(
        {
          success: true,
          url: signedUrl,
          expiresAt: new Date(Date.now() + SIGNED_URL_EXPIRY_MS).toISOString(),
        },
        {
          status: 200,
          headers: {
            // Allow CORS for audio playback from different origins
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        },
      );
    } catch (err) {
      console.error(
        `[api/sessions/audio/${messageId}] Error generating signed URL:`,
        err,
      );

      if (err instanceof ApiError) {
        return NextResponse.json(
          { success: false, error: err.message },
          { status: err.statusCode },
        );
      }

      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
      );
    }
  },
);

// Handle OPTIONS for CORS preflight
export const OPTIONS = WithContext<{ sessionId: string; messageId: string }>(
  async () => {
    return NextResponse.json(
      {},
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  },
);
