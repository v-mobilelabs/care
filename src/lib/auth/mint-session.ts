/**
 * Mint a fresh Firebase ID token that has `kind` baked in as a custom claim,
 * then create a session cookie from it.
 *
 * Why this is necessary:
 *   `auth.setCustomUserClaims` only affects **future** ID tokens — the token
 *   that was just exchanged during sign-in doesn't carry the claim yet.
 *   To bake `kind` into the session cookie we must:
 *     1. Create a custom token with the claim embedded.
 *     2. Exchange it for a fresh ID token via the REST API.
 *     3. Use that fresh token to create the session cookie.
 */
import { auth } from "@/lib/firebase/admin";
import { SESSION_DURATION_SECONDS, type UserKind } from "@/lib/auth/jwt";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function mintSessionCookieWithKind(
  uid: string,
  kind: UserKind,
): Promise<string> {
  // 1. Stamp kind into the user's custom claims (persisted in Firebase Auth).
  await auth.setCustomUserClaims(uid, { kind });

  // 2. Create a custom token carrying the kind claim.
  const customToken = await auth.createCustomToken(uid, { kind });

  // 3. Exchange for a fresh ID token so the claim is baked in.
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Token refresh failed.");
  }
  const { idToken } = (await res.json()) as { idToken: string };

  // 4. Create the session cookie from the fresh ID token.
  return auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_SECONDS * 1000,
  });
}
