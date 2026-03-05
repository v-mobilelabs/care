// GET /api/auth/firebase-token
// Returns a short-lived Firebase custom token + the user's kind for the
// currently authenticated session. The client uses the token to sign into
// Firebase Auth client-side, enabling RTDB writes (presence, etc.).
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, USER_KINDS, type UserKind } from "@/lib/auth/jwt";
import { auth } from "@/lib/firebase/admin";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    // Resolve kind from the session cookie claims, defaulting to "user".
    const rawKind = decoded["kind"] as string | undefined;
    const kind: UserKind = (USER_KINDS as readonly string[]).includes(
      rawKind ?? "",
    )
      ? (rawKind as UserKind)
      : "user";

    // Include kind as a custom claim so getIdTokenResult() also has it.
    const customToken = await auth.createCustomToken(decoded.uid, { kind });
    return NextResponse.json({ customToken, kind });
  } catch {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }
}
