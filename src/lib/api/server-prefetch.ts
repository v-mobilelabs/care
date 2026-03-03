/**
 * Server-only helpers for reading the authenticated user from the session
 * cookie. Used in RSC pages to prefetch TanStack Query data without an
 * extra HTTP round-trip.
 */
import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import type { SessionPayload } from "@/lib/auth/jwt";

/** Returns the verified session payload, or null if absent / invalid. */
export async function getServerUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
