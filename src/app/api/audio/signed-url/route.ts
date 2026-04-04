import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { bucket } from "@/lib/firebase/admin";

// Signed URL lifetime: 7 days
const SIGNED_URL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Only allow audio files under the sessions/ prefix
const ALLOWED_PATH_RE = /^sessions\/[^/]+\/audio\/[^/]+\.wav$/;

/**
 * GET /api/audio/signed-url?path=sessions/{sid}/audio/{mid}.wav
 *
 * Generates a fresh signed URL for the given audio storage path.
 * The path must match the expected sessions/{id}/audio/{id}.wav pattern.
 */
export const GET = WithContext(async ({ req }) => {
  const url = new URL(req.url);
  const storagePath = url.searchParams.get("path");

  console.log("[api/audio/signed-url] path:", storagePath);

  if (!storagePath || !ALLOWED_PATH_RE.test(storagePath)) {
    console.error("[api/audio/signed-url] Invalid path:", storagePath);
    return NextResponse.json(
      { success: false, error: "Invalid or missing audio path" },
      { status: 400 },
    );
  }

  const gcsFile = bucket.file(storagePath);
  const [exists] = await gcsFile.exists();

  console.log(
    "[api/audio/signed-url] exists:",
    exists,
    "for path:",
    storagePath,
  );

  if (!exists) {
    return NextResponse.json(
      { success: false, error: "Audio file not found" },
      { status: 404 },
    );
  }

  const [signedUrl] = await gcsFile.getSignedUrl({
    action: "read" as const,
    expires: Date.now() + SIGNED_URL_EXPIRY_MS,
  });

  return NextResponse.json({
    success: true,
    url: signedUrl,
    expiresAt: new Date(Date.now() + SIGNED_URL_EXPIRY_MS).toISOString(),
  });
});
