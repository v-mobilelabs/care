// Session JWT helpers — work in both Node.js (API routes) and Edge (proxy).
// Uses jose so it runs in Edge Runtime without firebase-admin.
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "careai_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(s);
}

export { COOKIE_NAME, SESSION_DURATION_SECONDS };

/** Create a signed session JWT for the given Firebase UID. */
export async function signSessionToken(
  uid: string,
  email: string,
): Promise<string> {
  return new SignJWT({ uid, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export interface SessionPayload {
  uid: string;
  email: string;
}

/** Verify a session JWT. Returns the payload or null if invalid/expired. */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
