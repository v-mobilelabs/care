// POST /api/presence — write the current user's presence via Admin SDK.
// The Admin SDK bypasses security rules, so this always works regardless of
// whether the Firebase client Auth session is fully established yet.
//
// Body: { online: boolean }
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, USER_KINDS, type UserKind } from "@/lib/auth/jwt";
import { auth, rtdb } from "@/lib/firebase/admin";
import { doctorProfileRepository } from "@/data/doctors";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    const rawKind = decoded["kind"] as string | undefined;
    const kind: UserKind = (USER_KINDS as readonly string[]).includes(
      rawKind ?? "",
    )
      ? (rawKind as UserKind)
      : "user";

    const body = (await req.json()) as { online?: boolean };
    const online = body.online !== false; // default true

    await rtdb.ref(`presence/${decoded.uid}`).set({
      online,
      lastSeen: Date.now(),
      kind,
    });

    // For doctors, mirror presence into Firestore availability so the
    // "Connect to a Doctor" page can query available doctors from Firestore.
    if (kind === "doctor") {
      await doctorProfileRepository
        .updateAvailability(decoded.uid, online ? "available" : "unavailable")
        .catch(() => {
          // Non-fatal — doctor profile may not exist yet during onboarding.
        });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update presence." },
      { status: 500 },
    );
  }
}
