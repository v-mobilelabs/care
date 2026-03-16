// POST /api/auth/session — exchange Firebase ID token for a Firebase session cookie.
// DELETE /api/auth/session — clear the session cookie (sign out).
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import { detectKind } from "@/lib/auth/detect-kind";
import { COOKIE_NAME, COOKIE_OPTS, type UserKind } from "@/lib/auth/jwt";
import { UpsertProfileUseCase } from "@/data/profile";
import { mintSessionCookieWithKind } from "@/lib/auth/mint-session";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { idToken?: string; kind?: string };
  const { idToken } = body;
  // Only "doctor" is accepted as an override — anything else is ignored and
  // kind is auto-detected from Firestore so the client can never elevate itself.
  const kindOverride: UserKind | undefined =
    body.kind === "doctor" ? "doctor" : undefined;

  if (!idToken)
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  // Verify the ID token first (also validates the user exists).
  const decoded = await auth.verifyIdToken(idToken);

  // If the caller signals this is a new doctor, stamp kind:"doctor" into
  // profiles/{uid} right now so detectKind() picks it up immediately.
  if (kindOverride === "doctor") {
    await new UpsertProfileUseCase().execute(
      UpsertProfileUseCase.validate({ userId: decoded.uid, kind: "doctor" }),
    );
  }

  // Auto-detect kind from the user's Firestore profile — never trust the client.
  const kind = await detectKind(decoded.uid);

  // Mint a fresh session cookie with the kind claim baked in.
  const sessionCookie = await mintSessionCookieWithKind(decoded.uid, kind);

  const res = NextResponse.json({ ok: true, kind });
  res.cookies.set(COOKIE_NAME, sessionCookie, COOKIE_OPTS);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
