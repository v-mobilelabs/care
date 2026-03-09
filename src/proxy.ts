import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/jwt";

// ── Public routes (no auth required) ─────────────────────────────────────────
const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/auth/",
  "/doctor/signup",
  "/doctor/register",
  "/_next/",
  "/favicon",
  "/privacy",
  "/terms",
];
const PUBLIC_EXACT = new Set(["/", "/design-system"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

// ── Kind-gated zones ──────────────────────────────────────────────────────────
// These are UI page zones — the proxy redirects users to the right portal.
// API routes (/api/**) are NOT blocked here; kind enforcement for APIs is
// done by WithContext({ kind }) at the handler level.
const DOCTOR_ZONE_PREFIX = "/doctor/";
const USER_ZONE_PREFIXES = ["/patient"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  // ── Not authenticated at all ──────────────────────────────────────────────
  if (!payload) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  // ── Kind-based zone enforcement ────────────────────────────────────────────
  // Doctor trying to access a user-only UI zone → redirect to their portal.
  if (
    payload.kind === "doctor" &&
    USER_ZONE_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const portalUrl = request.nextUrl.clone();
    portalUrl.pathname = "/doctor/dashboard";
    portalUrl.search = "";
    return NextResponse.redirect(portalUrl);
  }

  // User (non-doctor) trying to access the doctor zone → redirect to their portal.
  if (payload.kind === "user" && pathname.startsWith(DOCTOR_ZONE_PREFIX)) {
    const chatUrl = request.nextUrl.clone();
    chatUrl.pathname = "/patient";
    chatUrl.search = "";
    return NextResponse.redirect(chatUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
