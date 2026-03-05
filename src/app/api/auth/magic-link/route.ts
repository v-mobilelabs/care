// POST /api/auth/magic-link — server-side rate-limited magic link sender.
//
// Security layers (in order):
//   1. reCAPTCHA v3 score ≥ 0.5 — blocks automated bots invisibly
//   2. Rate-limit by IP: 5 req / 15 min — stops brute-force flooding
//   3. Rate-limit by email: 3 req / hour — prevents inbox spam
//   4. Email format validation before touching Firebase
import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limiter";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? "";
/** Minimum reCAPTCHA v3 score (0.0 = likely bot → 1.0 = likely human). */
const CAPTCHA_THRESHOLD = 0.5;

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function verifyCaptcha(
  token: string,
  ip: string,
): Promise<{ ok: boolean; score: number }> {
  const params = new URLSearchParams({
    secret: RECAPTCHA_SECRET,
    response: token,
    remoteip: ip,
  });
  const res = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?${params.toString()}`,
    { method: "POST" },
  );
  const data = (await res.json()) as {
    success: boolean;
    score: number;
    "error-codes"?: string[];
  };
  return {
    ok: data.success && data.score >= CAPTCHA_THRESHOLD,
    score: data.score ?? 0,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    email?: string;
    captchaToken?: string;
    kind?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const captchaToken = body.captchaToken;
  const kind = body.kind === "doctor" ? "doctor" : undefined;
  // Embed email (and optional kind) in continueUrl so the server-side verify
  // route can complete sign-in without relying on localStorage.
  const continueParams = new URLSearchParams({ email: email ?? "" });
  if (kind) continueParams.set("kind", kind);
  const redirectPath = `/api/auth/verify?${continueParams.toString()}`;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address." },
      { status: 400 },
    );
  }

  if (!captchaToken) {
    return NextResponse.json(
      { error: "Missing CAPTCHA token." },
      { status: 400 },
    );
  }

  const ip = clientIp(req);

  // ── reCAPTCHA v3 ─────────────────────────────────────────────────────────
  const captcha = await verifyCaptcha(captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json(
      {
        error:
          "Request blocked. If you're human, please refresh and try again.",
      },
      { status: 403 },
    );
  }

  // ── Rate limit by IP ──────────────────────────────────────────────────────
  // 5 magic-link requests per 15 minutes per IP (covers most legitimate use).
  const ipCheck = rateLimit(`ml:ip:${ip}`, {
    limit: 50,
    windowSeconds: 15 * 60,
  });
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfter) } },
    );
  }

  // ── Rate limit by email ───────────────────────────────────────────────────
  // 3 magic-link emails per hour per address (stops inbox flooding & spam regs).
  const emailCheck = rateLimit(`ml:email:${email}`, {
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!emailCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "A link was recently sent to this address. Check your inbox or wait before requesting another.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(emailCheck.retryAfter) },
      },
    );
  }

  if (!FIREBASE_API_KEY) {
    console.error("[magic-link] NEXT_PUBLIC_FIREBASE_API_KEY is not set");
    return NextResponse.json(
      { error: "Server misconfiguration." },
      { status: 500 },
    );
  }

  // ── Send via Firebase REST Identity Toolkit ───────────────────────────────
  const fbRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "EMAIL_SIGNIN",
        email,
        continueUrl: `${APP_URL}${redirectPath}`,
        canHandleCodeInApp: true,
      }),
    },
  );

  if (!fbRes.ok) {
    const err = (await fbRes.json()) as { error?: { message?: string } };
    console.error("[magic-link] Firebase error:", err.error?.message);
    return NextResponse.json(
      { error: "Could not send sign-in link. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
