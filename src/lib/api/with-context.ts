// Server-only — used in Next.js App Router API route handlers.
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import type { SessionPayload } from "@/lib/auth/jwt";

// ── Context type ──────────────────────────────────────────────────────────────

export interface ApiContext {
  user: SessionPayload; // { uid, email }
  req: NextRequest;
  /** Set when the client sends an X-Dependent-Id header. All health data
   *  queries should be scoped to users/{uid}/dependents/{dependentId}/… */
  dependentId?: string;
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

  static internal(message: string = ERRORS.INTERNAL.message): ApiError {
    return new ApiError(500, ERRORS.INTERNAL.code, message);
  }
}

// ── HOF ───────────────────────────────────────────────────────────────────────

/**
 * Higher-order function that wraps a Next.js App Router handler with:
 * - Session verification (reads the `careai_session` cookie → JWT)
 * - Typed `ApiContext` containing the authenticated user
 * - Zod / ApiError error handling
 * - Generic 500 fallback for unexpected throws
 *
 * @example
 * // src/app/api/sessions/route.ts
 * export const GET = WithContext(async ({ user }) => {
 *   const sessions = await new ListSessionsUseCase().execute({ userId: user.uid, limit: 20 });
 *   return NextResponse.json(sessions);
 * });
 *
 * @example
 * // Dynamic segment with params
 * export const DELETE = WithContext<{ sessionId: string }>(async ({ user }, { sessionId }) => {
 *   await new DeleteSessionUseCase().execute({ userId: user.uid, sessionId });
 *   return NextResponse.json({ ok: true });
 * });
 */
export function WithContext<
  TParams extends Record<string, string> = Record<string, string>,
>(handler: ApiHandler<TParams>) {
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

      const payload = await verifySessionToken(token);

      if (!payload) {
        return errorResponse(
          401,
          ERRORS.UNAUTHORIZED.code,
          "Session expired or invalid.",
        );
      }

      user = payload;
    } catch {
      return errorResponse(
        401,
        ERRORS.UNAUTHORIZED.code,
        ERRORS.UNAUTHORIZED.message,
      );
    }

    // ── 1b. Extract optional dependent header ─────────────────────────────────
    const dependentId = req.headers.get("x-dependent-id") ?? undefined;

    // ── 2. Invoke handler ─────────────────────────────────────────────────────
    try {
      return await handler({ user, req, dependentId }, resolvedParams);
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
