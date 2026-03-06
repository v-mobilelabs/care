// Server-only — used in Next.js App Router API route handlers.
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth/jwt";
import type { SessionPayload, UserKind } from "@/lib/auth/jwt";
import { auth } from "@/lib/firebase/admin";

// ── Context type ──────────────────────────────────────────────────────────────

export interface ApiContext {
  user: SessionPayload; // { uid, email, kind }
  req: NextRequest;
  /** Raw dependent ID from the X-Dependent-Id header. Undefined for the user's own profile. */
  dependentId?: string;
  /**
   * Resolved profile ID used as the Firestore path segment:
   *   profiles/{profileId}/sessions/…
   * Equals `dependentId` when viewing a dependent, or `user.uid` for self.
   */
  profileId: string;
}

// ── Handler signature ─────────────────────────────────────────────────────────

type ApiHandler<
  TParams extends Record<string, string> = Record<string, string>,
> = (ctx: ApiContext, params: TParams) => Promise<NextResponse>;

// ── Error codes ───────────────────────────────────────────────────────────────

const ERRORS = {
  UNAUTHORIZED: {
    status: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required.",
  },
  FORBIDDEN: { status: 403, code: "FORBIDDEN", message: "Access denied." },
  BAD_REQUEST: {
    status: 400,
    code: "BAD_REQUEST",
    message: "Invalid request.",
  },
  NOT_FOUND: { status: 404, code: "NOT_FOUND", message: "Resource not found." },
  CONFLICT: {
    status: 409,
    code: "CONFLICT",
    message: "Resource already exists.",
  },
  INTERNAL: {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  },
} as const;

/** Structured API error — throw this inside a handler to produce a typed response. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static unauthorized(message: string = ERRORS.UNAUTHORIZED.message): ApiError {
    return new ApiError(401, ERRORS.UNAUTHORIZED.code, message);
  }

  static forbidden(message: string = ERRORS.FORBIDDEN.message): ApiError {
    return new ApiError(403, ERRORS.FORBIDDEN.code, message);
  }

  static badRequest(message: string = ERRORS.BAD_REQUEST.message): ApiError {
    return new ApiError(400, ERRORS.BAD_REQUEST.code, message);
  }

  static notFound(message: string = ERRORS.NOT_FOUND.message): ApiError {
    return new ApiError(404, ERRORS.NOT_FOUND.code, message);
  }

  static conflict(message: string = ERRORS.CONFLICT.message): ApiError {
    return new ApiError(409, ERRORS.CONFLICT.code, message);
  }

  static internal(message: string = ERRORS.INTERNAL.message): ApiError {
    return new ApiError(500, ERRORS.INTERNAL.code, message);
  }
}

// ── HOF ───────────────────────────────────────────────────────────────────────

export interface WithContextOptions {
  /**
   * When set, the request is rejected with 403 unless `session.kind` matches.
   * Omit (or don't pass options at all) to allow any authenticated user.
   *
   * Extend `UserKind` in `@/lib/auth/jwt` to support new portal types —
   * no changes needed here.
   *
   * @example
   * // Any authenticated user
   * export const GET = WithContext(handler);
   *
   * // Doctors only
   * export const GET = WithContext({ kind: "doctor" }, handler);
   *
   * // Patients only
   * export const PATCH = WithContext({ kind: "patient" }, handler);
   */
  kind?: UserKind;
}

// Overload — options first, then handler
export function WithContext<
  TParams extends Record<string, string> = Record<string, string>,
>(
  options: WithContextOptions,
  handler: ApiHandler<TParams>,
): ReturnType<typeof makeRouteHandler<TParams>>;

// Overload — handler only (no kind restriction)
export function WithContext<
  TParams extends Record<string, string> = Record<string, string>,
>(handler: ApiHandler<TParams>): ReturnType<typeof makeRouteHandler<TParams>>;

export function WithContext<
  TParams extends Record<string, string> = Record<string, string>,
>(
  handlerOrOptions: ApiHandler<TParams> | WithContextOptions,
  maybeHandler?: ApiHandler<TParams>,
) {
  if (typeof handlerOrOptions === "function") {
    return makeRouteHandler(handlerOrOptions);
  }
  return makeRouteHandler(maybeHandler!, handlerOrOptions.kind);
}

// ── Core implementation ───────────────────────────────────────────────────────

function makeRouteHandler<
  TParams extends Record<string, string> = Record<string, string>,
>(handler: ApiHandler<TParams>, requiredKind?: UserKind) {
  return async function routeHandler(
    req: NextRequest,
    { params }: { params: Promise<TParams> },
  ): Promise<NextResponse> {
    // ── 1. Authenticate + resolve params (parallel — independent) ────────────
    let user: SessionPayload;
    let resolvedParams: TParams;

    try {
      const [cookieStore, rp] = await Promise.all([cookies(), params]);
      resolvedParams = rp;
      const token = cookieStore.get(COOKIE_NAME)?.value;

      if (!token) {
        return errorResponse(
          401,
          ERRORS.UNAUTHORIZED.code,
          ERRORS.UNAUTHORIZED.message,
        );
      }

      // verifySessionCookie with checkRevoked=true is Firebase's recommended
      // approach for session management. It automatically rejects sessions
      // whose user has been deleted, disabled, or had their tokens revoked —
      // no extra getUser() call needed.
      const decoded = await auth.verifySessionCookie(token, true);
      // Back-compat: tokens may carry kind:"patient" (brief migration window) — normalise to "user".
      const kind: UserKind = decoded.kind === "doctor" ? "doctor" : "user";
      user = { uid: decoded.uid, email: decoded.email ?? "", kind };
    } catch {
      return errorResponse(
        401,
        ERRORS.UNAUTHORIZED.code,
        "Session expired, revoked, or account no longer exists.",
      );
    }

    // ── 1b. Kind enforcement ──────────────────────────────────────────────────
    if (requiredKind && user.kind !== requiredKind) {
      return errorResponse(
        403,
        ERRORS.FORBIDDEN.code,
        `This endpoint requires a ${requiredKind} session.`,
      );
    }

    // ── 1c. Extract optional dependent header ─────────────────────────────────
    const dependentId = req.headers.get("x-dependent-id") ?? undefined;
    const profileId = dependentId ?? user.uid;

    // ── 2. Invoke handler ─────────────────────────────────────────────────────
    try {
      return await handler(
        { user, req, dependentId, profileId },
        resolvedParams,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.statusCode, err.code, err.message);
      }

      // Zod validation errors (ZodError)
      if (isZodError(err)) {
        const issues = err.issues.map(
          (i: { path: (string | number)[]; message: string }) =>
            `${i.path.join(".")}: ${i.message}`,
        );
        return errorResponse(400, ERRORS.BAD_REQUEST.code, issues.join("; "));
      }

      // Firestore missing index (gRPC FAILED_PRECONDITION = code 9)
      if (isFirestoreMissingIndexError(err)) {
        console.error(
          "[WithContext] Missing Firestore index:",
          (err as Error).message,
        );
        return errorResponse(
          503,
          "INDEX_MISSING",
          "A required database index is missing. Please contact support.",
        );
      }

      // Log in development; suppress full stack in production.
      if (process.env.NODE_ENV !== "production") {
        console.error("[WithContext] Unhandled error:", err);
      } else {
        console.error(
          "[WithContext] Unhandled error:",
          (err as Error)?.message ?? err,
        );
      }

      return errorResponse(500, ERRORS.INTERNAL.code, ERRORS.INTERNAL.message);
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Duck-type check for Zod errors without importing zod in this file. */
function isZodError(
  err: unknown,
): err is { issues: { path: (string | number)[]; message: string }[] } {
  return (
    typeof err === "object" &&
    err !== null &&
    "issues" in err &&
    Array.isArray((err as { issues: unknown }).issues)
  );
}

/**
 * Detect a Firestore query that failed because a composite index is missing.
 * The Admin SDK wraps gRPC errors with a numeric `code` property;
 * FAILED_PRECONDITION = 9.  The message always contains the Firebase Console
 * URL to create the index.
 */
function isFirestoreMissingIndexError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; message?: unknown };
  return (
    e.code === 9 &&
    typeof e.message === "string" &&
    e.message.toLowerCase().includes("index")
  );
}
