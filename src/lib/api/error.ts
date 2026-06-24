// API error types — next-free helper to avoid transitive dependency on next/server in shared packages.

export const ERRORS = {
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
