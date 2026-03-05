// GET /api/auth/verify — completes magic-link sign-in server-side.
// Firebase redirects here after the user clicks the email link, appending
// oobCode, mode, and apiKey to the continueUrl we supplied. We also embed
// `email` in the continueUrl so we don't need localStorage lookups.
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import { detectKind } from "@/lib/auth/detect-kind";
import { COOKIE_NAME, COOKIE_OPTS, type UserKind } from "@/lib/auth/jwt";
import { profileRepository } from "@/data/profile";
import { mintSessionCookieWithKind } from "@/lib/auth/mint-session";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

async function exchangeEmailLink(
  email: string,
  oobCode: string,
): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, oobCode }),
    },
  );
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Sign-in failed.");
  }
  return ((await res.json()) as { idToken: string }).idToken;
}

function errorRedirect(message: string): NextResponse {
  const url = new URL("/auth/verify", APP_URL);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const email = searchParams.get("email");
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");
  const kindParam =
    searchParams.get("kind") === "doctor" ? "doctor" : undefined;

  if (!email || !oobCode || mode !== "signIn") {
    return errorRedirect("Invalid sign-in link. Please request a new one.");
  }

  let destination: string;
  try {
    const idToken = await exchangeEmailLink(email, oobCode);
    const decoded = await auth.verifyIdToken(idToken);

    // If the magic link carried kind:"doctor", stamp that into Firestore and
    // use it directly — no need to round-trip through detectKind().
    let kind: UserKind;
    if (kindParam === "doctor") {
      await profileRepository.upsert({ userId: decoded.uid, kind: "doctor" });
      kind = "doctor";
    } else {
      kind = await detectKind(decoded.uid);
    }

    const sessionCookie = await mintSessionCookieWithKind(decoded.uid, kind);

    if (kindParam === "doctor") {
      // kind=doctor in the magic link → doctor registration/sign-in flow.
      // Check if the doctor has already completed their profile — new doctors
      // go to signup, existing ones go straight to the portal root which the
      // proxy forwards to /doctor/dashboard.

      destination = "/doctor";
    } else {
      destination = "/chat";
    }

    const destUrl = new URL(destination, APP_URL);
    const res = NextResponse.redirect(destUrl);
    res.cookies.set(COOKIE_NAME, sessionCookie, COOKIE_OPTS);
    return res;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Please request a new magic link.";
    return errorRedirect(msg);
  }
}
