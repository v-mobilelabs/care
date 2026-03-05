// Session JWT helpers — work in both Node.js (API routes) and Edge (proxy).
// Uses jose so it runs in Edge Runtime without firebase-admin.
import { decodeJwt } from "jose";

const COOKIE_NAME = "careai_session";
/**
 * Firebase session cookie max duration in seconds (5 days).
 * Firebase enforces an upper limit of 2 weeks (1_209_600 s).
 */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

export { COOKIE_NAME, SESSION_DURATION_SECONDS };

/**
 * Shared cookie options for the session cookie.
 * Exported so both auth routes use identical settings without duplication.
 */
export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

// ── User kinds ────────────────────────────────────────────────────────────────

/**
 * Canonical user-kind values stored as Firebase custom claims.
 *
 * Extend this tuple (and the union) as new portal types are introduced:
 *   "admin" | "pharmacist" | …
 *
 * Derive enums and runtime sets from this single source of truth.
 */
export const USER_KINDS = ["user", "doctor"] as const;
export type UserKind = (typeof USER_KINDS)[number];

export interface SessionPayload {
  uid: string;
  email: string;
  /** The type of user this session belongs to. */
  kind: UserKind;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Decode a Firebase session cookie for routing purposes — Edge-safe.
 *
 * Only decodes the JWT payload and checks the expiry timestamp.
 * Does NOT verify the Firebase signature or check revocation.
 * Full revocation + signature verification is done in Node API routes
 * via `auth.verifySessionCookie(cookie, true)` in `with-context.ts`.
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const claims = decodeJwt(token);
    // Reject expired tokens so the proxy redirects to login immediately.
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    // Firebase session cookies store uid in `sub`.
    const uid = typeof claims.sub === "string" ? claims.sub : null;
    if (!uid) return null;
    const email = typeof claims.email === "string" ? claims.email : "";
    // `kind` is persisted as a Firebase custom claim.
    // Back-compat: tokens written during a brief migration window may carry
    // kind:"patient" — normalise to the canonical "user" value.
    const kind: UserKind = claims.kind === "doctor" ? "doctor" : "user";
    return { uid, email, kind };
  } catch {
    return null;
  }
}
