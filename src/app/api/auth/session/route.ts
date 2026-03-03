// POST /api/auth/session — exchange Firebase ID token for a session cookie.
// DELETE /api/auth/session — clear the session cookie (sign out).
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import {
  signSessionToken,
  COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/jwt";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

export async function POST(req: NextRequest) {
  const { idToken } = (await req.json()) as { idToken: string };
  if (!idToken)
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  const decoded = await auth.verifyIdToken(idToken);
  const token = await signSessionToken(decoded.uid, decoded.email ?? "");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
